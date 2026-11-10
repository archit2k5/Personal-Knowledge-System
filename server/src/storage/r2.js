import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const endpoint =
  env.R2_ENDPOINT ||
  (env.R2_ACCOUNT_ID
    ? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : undefined);

export const s3Client = new S3Client({
  region: 'auto',
  endpoint,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

export function buildStorageKey(userId, chatId, documentId, randomId, ext) {
  const cleanExt = ext.startsWith('.') ? ext.slice(1) : ext;
  return `users/${userId}/chats/${chatId}/${documentId}/${randomId}.${cleanExt}`;
}

export async function putObject(key, body, contentType) {
  if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    logger.warn('R2 credentials not set; skipping object upload', { key });
    return;
  }

  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3Client.send(command);
  logger.info('Uploaded object to R2', { key, bucket: env.R2_BUCKET });
}

export async function getObjectStream(key) {
  const command = new GetObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: key,
  });

  const response = await s3Client.send(command);
  return response.Body || null;
}

export async function getPresignedDownloadUrl(
  key,
  originalName,
  expiresIn = env.R2_PRESIGN_TTL
) {
  if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    return `https://dummy-r2-download-url.local/${key}`;
  }

  const command = new GetObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(originalName)}"`,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

export async function deleteObject(key) {
  if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    return;
  }

  const command = new DeleteObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: key,
  });

  await s3Client.send(command);
  logger.info('Deleted object from R2', { key });
}

export async function deleteByPrefix(prefix) {
  if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    return;
  }

  let continuationToken = undefined;

  do {
    const listCommand = new ListObjectsV2Command({
      Bucket: env.R2_BUCKET,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });

    const listResponse = await s3Client.send(listCommand);

    if (listResponse.Contents && listResponse.Contents.length > 0) {
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: env.R2_BUCKET,
        Delete: {
          Objects: listResponse.Contents.map((obj) => ({ Key: obj.Key })),
          Quiet: true,
        },
      });

      await s3Client.send(deleteCommand);
      logger.info('Batch deleted objects by prefix from R2', {
        prefix,
        count: listResponse.Contents.length,
      });
    }

    continuationToken = listResponse.NextContinuationToken;
  } while (continuationToken);
}

