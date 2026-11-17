import os
import sys
import argparse
import time
import numpy as np
import torch
import boto3

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'ai_service')))

from ai_service.models.gaitbase import GaitBase
from ai_service.models.gaitgl_et import GaitGLET
from ai_service.pipelines.preprocessing import SilhouettePreprocessor

def test_video(video_path: str, model_name: str = 'GaitBase-v1', save_preview: str = 'extracted_silhouette_preview.png'):
    print("=" * 70)
    print(" WALKTRACE (GAITVISION) — LOCAL VIDEO BIOMETRIC TEST TOOL")
    print("=" * 70)

    if not os.path.exists(video_path):
        print(f"[Error] Video file not found: {video_path}")
        return

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"[*] Processing Device: {device}")
    print(f"[*] Target Video Footage: {video_path}")
    print(f"[*] Selected Model: {model_name}")

    # 1. Validation & Frame Extraction
    preprocessor = SilhouettePreprocessor()
    print("\n[Stage 1/4] Decoding video stream with OpenCV...")
    meta = preprocessor.validate_video(video_path)
    print(f"    - Resolution: {meta['width']}x{meta['height']}")
    print(f"    - Frame Rate: {meta['fps']} FPS")
    print(f"    - Total Frames: {meta['total_frames']}")
    print(f"    - Video Duration: {meta['duration']}s")

    frames = preprocessor.extract_frames(video_path, max_frames=45)
    print(f"    - Extracted {len(frames)} ordered frames for silhouette analysis.")

    # 2. Silhouette Segmentation & Normalization
    print("\n[Stage 2/4] Isolating walking silhouettes via MOG2 background subtractor...")
    silhouettes = preprocessor.extract_silhouettes(frames)
    print(f"    - Normalized {len(silhouettes)} silhouette frames to (64, 64) centered canvas.")
    
    preprocessor.save_silhouette_preview_strip(silhouettes, save_preview, num_samples=6)
    print(f"    - Saved visual 6-frame preview strip to: {os.path.abspath(save_preview)}")

    # 3. Model Inference
    print(f"\n[Stage 3/4] Executing PyTorch neural forward pass ({model_name})...")
    if 'GaitGL' in model_name:
        model = GaitGLET(in_channels=1, hidden_dim=64, embedding_dim=256).to(device)
    else:
        model = GaitBase(in_channels=1, hidden_dim=64, embedding_dim=256).to(device)
    model.eval()

    tensor_input = preprocessor.to_tensor(silhouettes).to(device)
    start_t = time.perf_counter()
    with torch.no_grad():
        embedding = model(tensor_input)
        embedding_np = embedding.cpu().numpy().flatten()
    latency_ms = (time.perf_counter() - start_t) * 1000

    print(f"    - Generated {len(embedding_np)}-D normalized embedding.")
    print(f"    - Vector L2 Norm: {np.linalg.norm(embedding_np):.4f}")
    print(f"    - Inference Latency: {latency_ms:.1f} ms")

    # 4. Identity Matching against Enrolled DynamoDB Gallery
    print("\n[Stage 4/4] Comparing probe embedding against DynamoDB enrolled gallery...")
    dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
    table = dynamodb.Table('gaitvision-main-dev')

    response = table.query(
        IndexName='GSI1',
        KeyConditionExpression="GSI1PK = :gpk",
        ExpressionAttributeValues={":gpk": "PROFILES"}
    )
    gallery_items = response.get('Items', [])
    probe_norm = embedding_np / (np.linalg.norm(embedding_np) + 1e-9)

    candidates = []
    for item in gallery_items:
        raw_vec = item.get('gaitVector')
        if not raw_vec or len(raw_vec) != 256:
            continue
        
        ref_vec = np.array([float(x) for x in raw_vec], dtype=np.float32)
        ref_norm = ref_vec / (np.linalg.norm(ref_vec) + 1e-9)

        dist = float(np.linalg.norm(probe_norm - ref_norm))
        cos_sim = float(np.dot(probe_norm, ref_norm))
        sim_pct = max(0.0, min(100.0, ((cos_sim + 1.0) / 2.0) * 100.0))

        candidates.append({
            "profileId": item.get('profileId'),
            "displayName": item.get('displayName'),
            "category": item.get('category'),
            "condition": item.get('walkingCondition', 'Normal (NM)'),
            "distance": dist,
            "similarity": sim_pct
        })

    candidates.sort(key=lambda c: c['distance'])

    print("\n" + "=" * 70)
    print(" BIOMETRIC IDENTIFICATION RESULTS")
    print("=" * 70)

    threshold = 1.35
    if candidates and candidates[0]['distance'] <= threshold:
        print(f"[STATUS]: MATCH FOUND (Nearest distance <= {threshold})")
    else:
        print(f"[STATUS]: NO MATCH (Nearest distance > {threshold} threshold)")

    print("-" * 70)
    print(f"{'RANK':<6} {'SUBJECT ID':<12} {'NAME':<24} {'SIMILARITY':<12} {'DISTANCE':<10}")
    print("-" * 70)

    for idx, c in enumerate(candidates[:5], 1):
        print(f"{idx:<6} {c['profileId']:<12} {c['displayName']:<24} {c['similarity']:>5.1f}%      {c['distance']:>6.3f}")

    print("-" * 70)
    print("*Disclaimer: Biometric similarity rankings require authorized operator confirmation.")
    print("=" * 70 + "\n")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="WalkTrace Video Test Tool")
    parser.add_argument('video_path', type=str, help="Path to video file (.mp4/.avi/.mov)")
    parser.add_argument('--model', type=str, default='GaitBase-v1', choices=['GaitBase-v1', 'GaitGL-ET'], help="Model architecture")
    args = parser.parse_args()

    test_video(args.video_path, args.model)
