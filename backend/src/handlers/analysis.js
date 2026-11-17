const { v4: uuidv4 } = require('uuid');
const { success, error } = require('../utils/response');
const { db, enqueueJob, checkObjectExists, bucketName } = require('../services/aws');
const { authenticate, authorize } = require('../middleware/auth');

exports.createJob = async (event) => {
  const user = await authenticate(event);
  if (!authorize(user, ['Administrator', 'Investigator', 'Analyst'])) {
    return error('Forbidden: Role insufficient to trigger analysis.', 403);
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return error('Invalid JSON payload');
  }

  const { videoId, modelId = 'GaitBase-v1', selectedTrackId = 'TRACK-001' } = body;
  if (!videoId) {
    return error('Missing required parameter: videoId', 400);
  }

  // 1. Verify that video exists in DynamoDB
  const video = await db.get(`VIDEO#${videoId}`, 'METADATA');
  if (!video) {
    return error(`Video record not found for videoId: ${videoId}`, 404);
  }

  // 2. Verify that the video is in READY/COMPLETED status
  if (video.uploadStatus !== 'READY' && video.uploadStatus !== 'COMPLETED') {
    return error(`Video ${videoId} is not ready for analysis. Current status: ${video.uploadStatus}`, 400);
  }

  // 3. Verify that S3 object exists
  const s3Check = await checkObjectExists(video.s3Key);
  if (!s3Check.exists) {
    return error(`Video media file missing in S3 bucket (${bucketName}/${video.s3Key})`, 400);
  }

  // 4. Idempotency: Check if an analysis job already exists in QUEUED or PROCESSING state for this video
  const recentJobs = await db.queryGSI1('ANALYSIS_JOBS');
  const existingJob = recentJobs.find(
    (j) => j.videoId === videoId && 
           j.selectedTrackId === selectedTrackId && 
           (j.status === 'QUEUED' || j.status === 'PROCESSING')
  );
  if (existingJob) {
    return success({
      message: 'Active analysis job already in progress (idempotent)',
      job: existingJob,
    }, 200);
  }

  const analysisId = `an-${uuidv4().slice(0, 8)}`;
  const now = new Date().toISOString();

  const jobItem = {
    PK: `ANALYSIS#${analysisId}`,
    SK: 'JOB',
    GSI1PK: 'ANALYSIS_JOBS',
    GSI1SK: now,
    analysisId,
    videoId,
    s3Bucket: video.s3Bucket || bucketName,
    s3Key: video.s3Key,
    userId: user.userId,
    userEmail: user.email,
    modelId,
    selectedTrackId,
    status: 'QUEUED',
    progress: 5,
    createdAt: now,
    updatedAt: now,
  };

  await db.put(jobItem);

  // Send asynchronous message to SQS pipeline
  await enqueueJob({
    jobType: 'GAIT_INFERENCE',
    analysisId,
    videoId: jobItem.videoId,
    s3Bucket: jobItem.s3Bucket,
    s3Key: jobItem.s3Key,
    modelId,
    selectedTrackId,
    timestamp: now,
  });

  return success(jobItem, 202);
};

exports.listJobs = async (event) => {
  await authenticate(event);
  const items = await db.queryGSI1('ANALYSIS_JOBS');
  return success({ jobs: items, total: items.length });
};

exports.getJob = async (event) => {
  await authenticate(event);
  const analysisId = event.pathParameters?.analysisId;
  if (!analysisId) return error('Missing analysisId', 400);

  const job = await db.get(`ANALYSIS#${analysisId}`, 'JOB');
  if (!job) {
    return error(`Analysis job not found: ${analysisId}`, 404);
  }
  return success(job);
};

exports.getResults = async (event) => {
  await authenticate(event);
  const analysisId = event.pathParameters?.analysisId;
  if (!analysisId) return error('Missing analysisId', 400);

  // Check if real results exist in DynamoDB
  const results = await db.get(`ANALYSIS#${analysisId}`, 'RESULTS');
  if (results) {
    return success(results);
  }

  // If not found in RESULTS, check JOB record status
  const job = await db.get(`ANALYSIS#${analysisId}`, 'JOB');
  if (!job) {
    return error(`Analysis not found: ${analysisId}`, 404);
  }

  if (job.status === 'QUEUED' || job.status === 'PROCESSING') {
    return success({
      analysisId,
      status: job.status,
      progress: job.progress || 10,
      modelId: job.modelId,
      message: job.status === 'QUEUED' ? 'Waiting in queue for AI inference worker...' : 'Extracting silhouettes and computing gait embedding...',
      candidateMatches: [],
    }, 200);
  }

  if (job.status === 'FAILED') {
    return success({
      analysisId,
      status: 'FAILED',
      error: job.error || 'Video analysis failed. Please check footage quality or format.',
      candidateMatches: [],
    }, 200);
  }

  return error(`Results not available for analysis: ${analysisId}`, 404);
};
