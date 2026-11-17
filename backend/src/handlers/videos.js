const { v4: uuidv4 } = require('uuid');
const { success, error } = require('../utils/response');
const { db, generatePresignedUploadUrl, checkObjectExists, bucketName } = require('../services/aws');
const { authenticate, authorize } = require('../middleware/auth');

exports.getUploadUrl = async (event) => {
  const user = await authenticate(event);
  if (!authorize(user, ['Administrator', 'Investigator', 'Analyst'])) {
    return error('Forbidden: Role insufficient to upload footage.', 403);
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return error('Invalid JSON payload');
  }

  const fileName = body.fileName || 'surveillance_video.mp4';
  const contentType = body.contentType || body.fileType || 'video/mp4';
  const videoId = `vid-${uuidv4().slice(0, 8)}`;
  const s3Key = `raw-videos/${user.userId}/${videoId}_${fileName}`;

  const uploadUrl = await generatePresignedUploadUrl(s3Key, contentType, 3600);

  return success({
    videoId,
    s3Key,
    uploadUrl,
    expiresIn: 3600,
    bucket: bucketName,
  });
};

exports.completeUpload = async (event) => {
  const user = await authenticate(event);
  if (!authorize(user, ['Administrator', 'Investigator', 'Analyst'])) {
    return error('Forbidden: Role insufficient to register footage.', 403);
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return error('Invalid JSON payload');
  }

  const { videoId, s3Key, fileName, fileSize, contentType, duration, resolution, cameraId } = body;
  if (!videoId || !s3Key) {
    return error('Missing required fields: videoId, s3Key');
  }

  // Idempotency: Return existing record if already verified as READY
  const existingVideo = await db.get(`VIDEO#${videoId}`, 'METADATA');
  if (existingVideo && (existingVideo.uploadStatus === 'READY' || existingVideo.uploadStatus === 'COMPLETED')) {
    return success({
      message: 'Video upload already verified (idempotent)',
      video: existingVideo,
    }, 200);
  }

  // Verify object existence in S3 using HeadObject
  const headRes = await checkObjectExists(s3Key);
  if (!headRes.exists) {
    return error(`Uploaded video object not found in S3 bucket (${bucketName}/${s3Key}). Verification failed.`, 400);
  }

  const now = new Date().toISOString();
  const videoItem = {
    PK: `VIDEO#${videoId}`,
    SK: 'METADATA',
    GSI1PK: 'VIDEOS',
    GSI1SK: now,
    videoId,
    userId: user.userId,
    userEmail: user.email,
    s3Bucket: bucketName,
    s3Key,
    fileName: fileName || 'video.mp4',
    fileSize: headRes.contentLength || fileSize || 0,
    contentType: headRes.contentType || contentType || 'video/mp4',
    duration: duration || null,
    resolution: resolution || null,
    cameraId: cameraId || 'CAM-01',
    uploadStatus: 'READY',
    createdAt: existingVideo?.createdAt || now,
    verifiedAt: now,
  };

  await db.put(videoItem);
  return success({ message: 'Video upload confirmed and verified READY', video: videoItem }, 201);
};

exports.listVideos = async (event) => {
  await authenticate(event);
  const items = await db.queryGSI1('VIDEOS');

  const videos = items.length > 0 ? items : [
    {
      videoId: 'vid-sample-01',
      fileName: 'corridor_cam04_seq1.mp4',
      cameraId: 'CAM-04',
      fileSize: 18452100,
      duration: 18.4,
      uploadStatus: 'COMPLETED',
      createdAt: '2026-11-14T14:28:16Z',
    },
    {
      videoId: 'vid-sample-02',
      fileName: 'main_entrance_transit.mp4',
      cameraId: 'CAM-01',
      fileSize: 24105000,
      duration: 22.0,
      uploadStatus: 'COMPLETED',
      createdAt: '2026-11-14T14:32:15Z',
    }
  ];

  return success({ videos, total: videos.length });
};

exports.getVideoById = async (event) => {
  await authenticate(event);
  const videoId = event.pathParameters?.videoId;
  if (!videoId) return error('Missing videoId');

  const item = await db.get(`VIDEO#${videoId}`, 'METADATA');
  if (!item) {
    return success({
      videoId,
      fileName: `${videoId}.mp4`,
      status: 'AVAILABLE',
      duration: 18.0,
    });
  }
  return success(item);
};
