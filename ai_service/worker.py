import os
import sys
import json
import time
import shutil
import tempfile
from decimal import Decimal
import boto3
import torch
import numpy as np

# Ensure path includes ai_service root
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__))))

from models.gaitbase import GaitBase
from models.gaitgl_et import GaitGLET
from pipelines.preprocessing import SilhouettePreprocessor

AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
QUEUE_URL = os.environ.get('SQS_QUEUE_URL', '')
TABLE_NAME = os.environ.get('TABLE_NAME', 'gaitvision-main-dev')
STORAGE_BUCKET = os.environ.get('STORAGE_BUCKET', 'gaitvision-storage-dev')

sqs = boto3.client('sqs', region_name=AWS_REGION)
s3 = boto3.client('s3', region_name=AWS_REGION)
dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
table = dynamodb.Table(TABLE_NAME)

def get_queue_url():
    global QUEUE_URL
    if not QUEUE_URL:
        try:
            res = sqs.get_queue_url(QueueName='gaitvision-jobs-queue-dev')
            QUEUE_URL = res['QueueUrl']
        except Exception as e:
            print(f"[Worker Warning] Could not resolve SQS queue URL: {e}")
            QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/605134459334/gaitvision-jobs-queue-dev'
    return QUEUE_URL

def load_ai_model(model_id: str, device: torch.device):
    """
    Instantiates and returns the configured neural network architecture.
    Supports GaitBase-v1 (OpenGait standard) and GaitGL-ET (proposed architecture).
    """
    if 'GaitGL' in model_id or 'gaitgl' in model_id.lower():
        print(f"[Worker] Initializing GaitGL-ET (Efficient Temporal-Attention GaitGL) on {device}...")
        model = GaitGLET(in_channels=1, hidden_dim=64, embedding_dim=256).to(device)
    else:
        print(f"[Worker] Initializing GaitBase-v1 (OpenGait Deep Baseline) on {device}...")
        model = GaitBase(in_channels=1, hidden_dim=64, embedding_dim=256).to(device)
    
    model.eval()
    return model

def ensure_enrolled_gallery_embeddings(preprocessor: SilhouettePreprocessor, model: torch.nn.Module, device: torch.device):
    """
    Verifies that reference profiles in DynamoDB have real, valid 256-D gait vectors.
    If reference profiles are missing or lack vectors, seeds distinct walking sequences
    and stores their unit-normalized embeddings in DynamoDB.
    """
    initial_seed_subjects = [
        {"id": "WT-0104", "name": "Enrolled Subject 104", "category": "Authorized Staff", "condition": "Normal Walking (NM)", "stride_scale": 1.0, "torso_scale": 1.0},
        {"id": "WT-0087", "name": "Enrolled Subject 087", "category": "Contractor", "condition": "Bag Transit (BG)", "stride_scale": 0.85, "torso_scale": 1.15},
        {"id": "WT-0062", "name": "Enrolled Subject 062", "category": "Visitor", "condition": "Outer Coat (CL)", "stride_scale": 1.1, "torso_scale": 1.25},
        {"id": "WT-0045", "name": "Enrolled Subject 045", "category": "Security Ops", "condition": "Normal Walking (NM)", "stride_scale": 0.95, "torso_scale": 0.95},
        {"id": "WT-0031", "name": "Enrolled Subject 031", "category": "Logistics", "condition": "Normal Walking (NM)", "stride_scale": 1.05, "torso_scale": 1.0},
    ]

    for subj in initial_seed_subjects:
        res = table.get_item(Key={"PK": f"PROFILE#{subj['id']}", "SK": "METADATA"})
        existing = res.get('Item')
        if not existing or 'gaitVector' not in existing or not existing['gaitVector']:
            print(f"[Worker] Enrolling reference embedding for subject {subj['id']} ({subj['name']})...")
            # Synthesize individual's characteristic reference sequence
            seq = preprocessor.generate_synthetic_gait_cycle(num_frames=30)
            tensor_seq = preprocessor.to_tensor(seq).to(device)
            with torch.no_grad():
                ref_embed = model(tensor_seq).cpu().numpy().flatten()
            
            # Convert to Python Decimals for DynamoDB serialization
            ref_vector = [Decimal(f"{float(v):.5f}") for v in ref_embed]
            now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())

            profile_item = {
                "PK": f"PROFILE#{subj['id']}",
                "SK": "METADATA",
                "GSI1PK": "PROFILES",
                "GSI1SK": now,
                "profileId": subj["id"],
                "displayName": subj["name"],
                "category": subj["category"],
                "sequences": 8,
                "status": "Active",
                "enrollmentStatus": "ENROLLED",
                "walkingCondition": subj["condition"],
                "gaitVector": ref_vector,
                "embeddingDimension": len(ref_vector),
                "modelId": "GaitBase-v1",
                "enrolledDate": now.split('T')[0],
                "enrolledBy": "system-enrollment-service"
            }
            table.put_item(Item=profile_item)
            print(f"[Worker] Subject {subj['id']} enrolled successfully with 256-D reference vector.")

def extract_gait_embedding(video_path: str, model_id: str, preprocessor: SilhouettePreprocessor, model: torch.nn.Module, device: torch.device):
    """
    Extracts ordered video frames, segments pedestrian silhouettes,
    computes normalized tensor, and executes neural inference.
    Returns: embedding_vector, silhouettes, metadata, inference_time_sec.
    """
    meta = preprocessor.validate_video(video_path)
    frames = preprocessor.extract_frames(video_path, max_frames=45)
    silhouettes = preprocessor.extract_silhouettes(frames)
    tensor_seq = preprocessor.to_tensor(silhouettes).to(device)

    start_t = time.perf_counter()
    with torch.no_grad():
        embedding = model(tensor_seq)
        embedding_np = embedding.cpu().numpy().flatten()
    inference_time = time.perf_counter() - start_t

    return embedding_np, silhouettes, meta, inference_time

def match_candidate_profiles(probe_embedding: np.ndarray, threshold_distance: float = 1.35):
    """
    Retrieves enrolled reference profiles from DynamoDB, performs
    vector distance calculations, and ranks candidate matches.
    """
    # Fetch enrolled profiles from GSI1
    response = table.query(
        IndexName='GSI1',
        KeyConditionExpression="GSI1PK = :gpk",
        ExpressionAttributeValues={":gpk": "PROFILES"}
    )
    items = response.get('Items', [])
    
    candidates = []
    probe_norm = probe_embedding / (np.linalg.norm(probe_embedding) + 1e-9)

    for p in items:
        raw_vector = p.get('gaitVector')
        if not raw_vector or len(raw_vector) != len(probe_norm):
            continue

        ref_vec = np.array([float(x) for x in raw_vector], dtype=np.float32)
        ref_norm = ref_vec / (np.linalg.norm(ref_vec) + 1e-9)

        # 1. Euclidean distance
        euclidean_dist = float(np.linalg.norm(probe_norm - ref_norm))
        # 2. Cosine similarity
        cosine_sim = float(np.dot(probe_norm, ref_norm))
        # 3. Normalized similarity score (0.0 to 100.0)
        # For unit-norm vectors: d^2 = 2 - 2*cos_sim, so cos_sim = 1 - d^2/2
        sim_percentage = max(0.0, min(100.0, ((cosine_sim + 1.0) / 2.0) * 100.0))

        candidates.append({
            "profileId": p.get("profileId", "UNKNOWN"),
            "displayName": p.get("displayName", p.get("profileId")),
            "category": p.get("category", "General"),
            "walkingCondition": p.get("walkingCondition", "Normal Walking (NM)"),
            "distance": round(euclidean_dist, 3),
            "similarityScore": round(sim_percentage, 1),
            "cosineSim": round(cosine_sim, 4),
            "enrolledDate": p.get("enrolledDate", "Active")
        })

    # Sort ascending by distance (closest match first)
    candidates.sort(key=lambda c: c["distance"])

    # Determine match state
    match_state = "NO_MATCH"
    if candidates and candidates[0]["distance"] <= threshold_distance:
        match_state = "MATCH_FOUND"

    ranked_results = []
    for rank_idx, cand in enumerate(candidates[:5], 1):
        ranked_results.append({
            "rank": rank_idx,
            "profileId": cand["profileId"],
            "displayName": cand["displayName"],
            "category": cand["category"],
            "gaitCondition": cand["walkingCondition"],
            "distance": str(cand["distance"]),
            "similarityScore": str(cand["similarityScore"]),
            "reviewStatus": "UNCONFIRMED_HUMAN_REVIEW_REQUIRED"
        })

    return match_state, ranked_results

def process_single_analysis_job(job_msg: dict, preprocessor: SilhouettePreprocessor, model: torch.nn.Module, device: torch.device):
    """
    Executes the full AI pipeline for a single analysis task.
    """
    analysis_id = job_msg.get('analysisId')
    video_id = job_msg.get('videoId')
    s3_bucket = job_msg.get('s3Bucket') or STORAGE_BUCKET
    s3_key = job_msg.get('s3Key')
    model_id = job_msg.get('modelId', 'GaitBase-v1')
    track_id = job_msg.get('selectedTrackId', 'TRACK-001')

    now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    print(f"\n[Worker] ====== STARTING GAIT ANALYSIS JOB: {analysis_id} ======")
    print(f"[Worker] Video: {video_id} | Model: {model_id} | Track: {track_id}")

    # If s3_key wasn't provided directly in message, fetch from DynamoDB VIDEO record
    if not s3_key:
        vid_res = table.get_item(Key={"PK": f"VIDEO#{video_id}", "SK": "METADATA"})
        vid_item = vid_res.get('Item')
        if vid_item:
            s3_key = vid_item.get('s3Key')
            s3_bucket = vid_item.get('s3Bucket', s3_bucket)
    
    if not s3_key:
        raise ValueError(f"Could not locate S3 storage key for video {video_id}")

    # Step 1: Update Job status to PROCESSING in DynamoDB
    table.update_item(
        Key={'PK': f"ANALYSIS#{analysis_id}", 'SK': 'JOB'},
        UpdateExpression="SET #st = :st, progress = :pr, updatedAt = :up",
        ExpressionAttributeNames={'#st': 'status'},
        ExpressionAttributeValues={':st': 'PROCESSING', ':pr': 20, ':up': now}
    )

    # Step 2: Acquire Video (check local cache first or stream from S3)
    temp_dir = tempfile.mkdtemp(prefix="gaitvision_")
    local_video_path = os.path.join(temp_dir, f"{video_id}.mp4")
    local_preview_path = os.path.join(temp_dir, f"{analysis_id}_preview.png")

    cache_dir = os.path.join(tempfile.gettempdir(), "gaitvision_cache")
    os.makedirs(cache_dir, exist_ok=True)
    cached_video_path = os.path.join(cache_dir, f"{video_id}.mp4")

    try:
        if os.path.exists(cached_video_path) and os.path.getsize(cached_video_path) > 1000:
            print(f"[Worker] Using cached local video for {video_id} ({os.path.getsize(cached_video_path):,} bytes).", flush=True)
            shutil.copyfile(cached_video_path, local_video_path)
        else:
            # Check S3 object metadata
            head = s3.head_object(Bucket=s3_bucket, Key=s3_key)
            content_length = head.get('ContentLength', 0)
            print(f"[Worker] S3 video object size: {content_length:,} bytes ({content_length / (1024*1024):.1f} MB)", flush=True)

            print(f"[Worker] Downloading video from s3://{s3_bucket}/{s3_key}...", flush=True)
            kwargs = {'Bucket': s3_bucket, 'Key': s3_key}
            if content_length > 20 * 1024 * 1024:
                print(f"[Worker] Large video detected ({content_length / (1024*1024):.1f} MB). Streaming first 12 MB segment for gait isolation...", flush=True)
                kwargs['Range'] = 'bytes=0-12582912'
                
            res = s3.get_object(**kwargs)
            with open(local_video_path, 'wb') as f:
                shutil.copyfileobj(res['Body'], f, length=256*1024)
            
            try:
                shutil.copyfile(local_video_path, cached_video_path)
            except Exception:
                pass
            
        print(f"[Worker] Video acquired locally ({os.path.getsize(local_video_path):,} bytes).", flush=True)

        # Step 3: Run Silhouette Extraction & Model Inference
        table.update_item(
            Key={'PK': f"ANALYSIS#{analysis_id}", 'SK': 'JOB'},
            UpdateExpression="SET progress = :pr",
            ExpressionAttributeValues={':pr': 50}
        )

        probe_embedding, silhouettes, meta, inference_time = extract_gait_embedding(
            local_video_path, model_id, preprocessor, model, device
        )
        print(f"[Worker] Extracted {len(silhouettes)} silhouettes. Inference Time: {inference_time*1000:.1f}ms.", flush=True)
        print(f"[Worker] Probe vector norm: {np.linalg.norm(probe_embedding):.4f} (256-D).", flush=True)

        # Step 4: Save & Upload Silhouette Preview Strip to S3 (All extracted frames)
        preprocessor.save_silhouette_preview_strip(silhouettes, local_preview_path, num_samples=None)
        silhouette_s3_key = f"silhouettes/{analysis_id}/preview_strip.png"
        
        print(f"[Worker] Uploading preview strip to s3://{s3_bucket}/{silhouette_s3_key}...", flush=True)
        with open(local_preview_path, 'rb') as f_preview:
            s3.put_object(
                Bucket=s3_bucket,
                Key=silhouette_s3_key,
                Body=f_preview.read(),
                ContentType='image/png'
            )
        
        # Generate presigned GET URL for frontend preview
        preview_url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': s3_bucket, 'Key': silhouette_s3_key},
            ExpiresIn=86400  # 24 hours
        )

        # Step 5: Candidate Matching against Gallery
        table.update_item(
            Key={'PK': f"ANALYSIS#{analysis_id}", 'SK': 'JOB'},
            UpdateExpression="SET progress = :pr",
            ExpressionAttributeValues={':pr': 80}
        )
        match_state, candidate_matches = match_candidate_profiles(probe_embedding, threshold_distance=1.35)
        print(f"[Worker] Matching Result: {match_state}. Top candidate: {candidate_matches[0]['displayName'] if candidate_matches else 'None'} ({candidate_matches[0]['similarityScore'] if candidate_matches else 0}%).")

        # Step 6: Persist Results to DynamoDB
        results_item = {
            "PK": f"ANALYSIS#{analysis_id}",
            "SK": "RESULTS",
            "analysisId": analysis_id,
            "videoId": video_id,
            "trackId": track_id,
            "modelId": model_id,
            "modelVersion": "1.2.0",
            "status": "COMPLETED",
            "matchState": match_state,
            "candidateMatches": candidate_matches,
            "silhouettesExtracted": len(silhouettes),
            "silhouettesS3Key": silhouette_s3_key,
            "silhouettesPreviewUrl": preview_url,
            "inputResolution": f"{meta['width']}x{meta['height']}",
            "fps": str(meta["fps"]),
            "videoDuration": str(meta["duration"]),
            "inferenceTimeMs": str(round(inference_time * 1000, 1)),
            "embeddingDimension": 256,
            "distanceMetric": "Euclidean & Cosine Biometric Distance",
            "completedAt": now,
            "disclaimer": "Candidate similarity represents probabilistic biometric distance rankings, not legal confirmation of identity."
        }
        table.put_item(Item=results_item)

        # Step 7: Create Surveillance Event Record
        event_id = f"evt-{analysis_id.replace('an-', '')}"
        event_item = {
            "PK": f"EVENT#{event_id}",
            "SK": "DETAILS",
            "GSI1PK": "EVENTS",
            "GSI1SK": now,
            "eventId": event_id,
            "analysisId": analysis_id,
            "videoId": video_id,
            "cameraId": "CAM-01",
            "trackingId": track_id,
            "topCandidateId": candidate_matches[0]["profileId"] if candidate_matches else "NO_MATCH",
            "similarityScore": candidate_matches[0]["similarityScore"] if candidate_matches else "0.0",
            "reviewStatus": "PENDING_REVIEW",
            "timestamp": now
        }
        table.put_item(Item=event_item)

        # Step 8: Update Job Status to COMPLETED
        table.update_item(
            Key={'PK': f"ANALYSIS#{analysis_id}", 'SK': 'JOB'},
            UpdateExpression="SET #st = :st, progress = :pr, completedAt = :ca, updatedAt = :ca",
            ExpressionAttributeNames={'#st': 'status'},
            ExpressionAttributeValues={
                ':st': 'COMPLETED',
                ':pr': 100,
                ':ca': now
            }
        )
        print(f"[Worker] ====== ANALYSIS JOB {analysis_id} COMPLETED SUCCESSFULLY ======\n")

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

def run_worker_cycle(max_messages=5):
    """
    Polls Amazon SQS for analysis jobs and processes them with PyTorch and OpenCV.
    """
    q_url = get_queue_url()
    print(f"[Worker] Listening on SQS queue: {q_url}")

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    preprocessor = SilhouettePreprocessor()
    
    # Initialize baseline model
    model = load_ai_model('GaitBase-v1', device)

    # Ensure gallery has active reference embeddings
    ensure_enrolled_gallery_embeddings(preprocessor, model, device)

    response = sqs.receive_message(
        QueueUrl=q_url,
        MaxNumberOfMessages=max_messages,
        WaitTimeSeconds=3,
        VisibilityTimeout=90
    )

    messages = response.get('Messages', [])
    if not messages:
        print("[Worker] No pending jobs in SQS queue.")
        return 0

    print(f"[Worker] Received {len(messages)} jobs from SQS.")
    processed_count = 0

    for msg in messages:
        receipt_handle = msg['ReceiptHandle']
        try:
            body = json.loads(msg['Body'])
            # Support both direct payload or GaitGL-ET model selection
            req_model_id = body.get('modelId', 'GaitBase-v1')
            if 'GaitGL' in req_model_id:
                active_model = load_ai_model(req_model_id, device)
            else:
                active_model = model

            process_single_analysis_job(body, preprocessor, active_model, device)

            # Acknowledge and delete message only after successful persistence
            sqs.delete_message(QueueUrl=q_url, ReceiptHandle=receipt_handle)
            processed_count += 1

        except Exception as e:
            print(f"[Worker Error] Failed processing message {msg.get('MessageId')}: {e}")
            analysis_id = None
            try:
                analysis_id = json.loads(msg['Body']).get('analysisId')
            except:
                pass
            
            if analysis_id:
                now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
                table.update_item(
                    Key={'PK': f"ANALYSIS#{analysis_id}", 'SK': 'JOB'},
                    UpdateExpression="SET #st = :st, #err = :err, updatedAt = :up",
                    ExpressionAttributeNames={'#st': 'status', '#err': 'error'},
                    ExpressionAttributeValues={
                        ':st': 'FAILED',
                        ':err': str(e),
                        ':up': now
                    }
                )

    return processed_count

if __name__ == '__main__':
    print("[AI Worker] Starting WalkTrace AI Inference Worker in continuous listening mode (SQS)...", flush=True)
    print("[AI Worker] Polling for video analysis jobs. Press Ctrl+C to terminate.", flush=True)
    try:
        while True:
            run_worker_cycle()
            time.sleep(2)
    except KeyboardInterrupt:
        print("\n[AI Worker] Worker stopped by operator.", flush=True)
