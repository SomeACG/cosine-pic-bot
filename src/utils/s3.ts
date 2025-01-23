import { S3_BUCKET_NAME, S3_ENDPOINT, S3_REGION } from '@/constants';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import mimeTypes from 'mime-types';

// 配置 S3
export const s3 = new S3Client({
  endpoint: S3_ENDPOINT,
  region: S3_REGION,
});

// https://github.com/yy4382/s3-image-port/blob/main/app/utils/ImageS3Client.ts#L159
export function calculateMIME(file: File | Blob | string | Buffer, key: string) {
  const defaultMIME = 'application/octet-stream';
  const keyExt = key.split('.').pop();

  switch (true) {
    case file instanceof String:
      return 'text/plain';
    case file instanceof File || file instanceof Blob:
      if (file.type) {
        return file.type;
      } else if (keyExt) {
        return mimeTypes.lookup(keyExt) || defaultMIME;
      } else {
        console.error('Unexpected file type', key);
        return defaultMIME;
      }
    case Buffer.isBuffer(file):
      return keyExt ? mimeTypes.lookup(keyExt) || defaultMIME : defaultMIME;
    default:
      return defaultMIME;
  }
}

/**
 *
 * @param file The (processed) file to upload
 * @param key The key to use in S3
 * @returns The response from the S3 upload operation
 */
export async function uploadS3(file: File | string | Buffer, key: string) {
  try {
    const mimeType = calculateMIME(file, key);

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: mimeType,
    });
    const response = await s3.send(command);
    // If the HTTP status code is not 200, throw an error
    const httpStatusCode = response.$metadata.httpStatusCode!;
    if (httpStatusCode >= 300) {
      throw new Error(`List operation get http code: ${httpStatusCode}`);
    }

    return response;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export default s3;
