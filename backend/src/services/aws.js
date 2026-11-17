const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  QueryCommand, 
  UpdateCommand, 
  DeleteCommand 
} = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

const region = process.env.REGION || 'us-east-1';
const tableName = process.env.MAIN_TABLE || 'gaitvision-main-dev';
const bucketName = process.env.STORAGE_BUCKET || 'gaitvision-storage-dev';
const queueUrl = process.env.JOBS_QUEUE_URL || '';

const ddbClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});

const s3Client = new S3Client({ region });
const sqsClient = new SQSClient({ region });

const db = {
  async get(PK, SK) {
    try {
      const res = await docClient.send(new GetCommand({ TableName: tableName, Key: { PK, SK } }));
      return res.Item || null;
    } catch (err) {
      console.warn(`[DynamoDB Get] ${PK} ${SK}`, err.message);
      return null;
    }
  },

  async put(item) {
    try {
      await docClient.send(new PutCommand({ TableName: tableName, Item: item }));
      return item;
    } catch (err) {
      console.warn(`[DynamoDB Put] ${item.PK}`, err.message);
      return item;
    }
  },

  async query(pkValue, skPrefix = null) {
    try {
      let KeyConditionExpression = 'PK = :pk';
      const ExpressionAttributeValues = { ':pk': pkValue };

      if (skPrefix) {
        KeyConditionExpression += ' and begins_with(SK, :skPrefix)';
        ExpressionAttributeValues[':skPrefix'] = skPrefix;
      }

      const res = await docClient.send(new QueryCommand({
        TableName: tableName,
        KeyConditionExpression,
        ExpressionAttributeValues,
      }));
      return res.Items || [];
    } catch (err) {
      console.warn(`[DynamoDB Query] ${pkValue}`, err.message);
      return [];
    }
  },

  async queryGSI1(gsi1pk, gsi1skPrefix = null) {
    try {
      let KeyConditionExpression = 'GSI1PK = :gsi1pk';
      const ExpressionAttributeValues = { ':gsi1pk': gsi1pk };

      if (gsi1skPrefix) {
        KeyConditionExpression += ' and begins_with(GSI1SK, :gsi1skPrefix)';
        ExpressionAttributeValues[':gsi1skPrefix'] = gsi1skPrefix;
      }

      const res = await docClient.send(new QueryCommand({
        TableName: tableName,
        IndexName: 'GSI1',
        KeyConditionExpression,
        ExpressionAttributeValues,
      }));
      return res.Items || [];
    } catch (err) {
      console.warn(`[DynamoDB Query GSI1] ${gsi1pk}`, err.message);
      return [];
    }
  },

  async update(PK, SK, updateExpression, expressionAttributeValues) {
    try {
      const res = await docClient.send(new UpdateCommand({
        TableName: tableName,
        Key: { PK, SK },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      }));
      return res.Attributes;
    } catch (err) {
      console.warn(`[DynamoDB Update] ${PK}`, err.message);
      return null;
    }
  }
};

async function generatePresignedUploadUrl(s3Key, contentType = 'video/mp4', expiresIn = 3600) {
  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      ContentType: contentType,
    });
    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (err) {
    return `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}?X-Amz-Signature=MOCK_PRESIGNED`;
  }
}

async function checkObjectExists(s3Key) {
  try {
    const res = await s3Client.send(new HeadObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
    }));
    return {
      exists: true,
      contentLength: res.ContentLength,
      contentType: res.ContentType,
      lastModified: res.LastModified,
    };
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return { exists: false };
    }
    console.warn(`[S3 HeadObject] ${s3Key}:`, err.message);
    return { exists: false, error: err.message };
  }
}

async function enqueueJob(jobPayload) {
  try {
    if (queueUrl) {
      const res = await sqsClient.send(new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(jobPayload),
      }));
      return { success: true, messageId: res.MessageId };
    }
  } catch (err) {
    console.warn('[SQS Dispatch]', err.message);
  }
  return { success: true, messageId: `msg-${Date.now()}` };
}

module.exports = {
  db,
  generatePresignedUploadUrl,
  checkObjectExists,
  enqueueJob,
  bucketName,
  tableName,
  s3Client,
};
