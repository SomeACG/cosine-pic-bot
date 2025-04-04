import { S3_BUCKET_NAME, S3_ENDPOINT, S3_REGION } from '@/constants';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import mimeTypes from 'mime-types';

// 配置 S3
export const s3 = new S3Client({
  endpoint: S3_ENDPOINT,
  region: S3_REGION,
});

// https://github.com/yy4382/s3-image-port/blob/main/app/utils/ImageS3Client.ts#L159
export function calculateMIME(file: string | Buffer, key: string) {
  const defaultMIME = 'application/octet-stream';
  const keyExt = key.split('.').pop();

  switch (true) {
    case typeof file === 'string':
      return 'text/plain';
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
export async function uploadS3(file: string | Buffer, key: string) {
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

// export async function backupDBToS3IfEnabled(ctx: any) {
//   // 上传数据库文件到 S3 备份
//   if (ENABLE_S3_BACKUP) {
//     try {
//       const dbFile = fs.readFileSync('prisma/data.db');
//       await uploadS3(dbFile, 'data.db');
//       const s3Path = `${S3_PUBLIC_URL}/data.db`;
//       await ctx.reply(`数据库备份已上传至 [S3 ☁️](${s3Path})`, { parse_mode: 'MarkdownV2' });
//     } catch (error: any) {
//       console.error('上传数据库文件失败:', error);
//       await ctx.reply(`数据库备份上传失败 ❌, 错误: \`\`\`\n${error?.message ?? '未知错误'}\n\`\`\``, {
//         parse_mode: 'MarkdownV2',
//       });
//     }
//   }
// }

export default s3;
