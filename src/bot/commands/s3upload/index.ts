import { WrapperContext } from '@/bot/wrappers/command-wrapper';
import { DOWNLOAD_DIR, ENABLE_S3_BACKUP, S3_BUCKET_NAME, S3_ENDPOINT, S3_OUTPUT_DIR } from '@/constants';
import logger from '@/utils/logger';
import { uploadS3 } from '@/utils/s3';
import { CommandMiddleware } from 'grammy';
import fs from 'fs';
import path from 'path';
import { Platform } from '@/constants/enum';
import { clearDirectory } from '@/utils/fs';

// 定义平台统计类型
type PlatformStat = {
  files: number;
  size: number;
  success: number;
  failed: number;
};

// 定义统计数据类型
interface UploadStats {
  totalFiles: number;
  uploadedFiles: number;
  failedFiles: number;
  totalSize: number;
  platformStats: Record<Platform, PlatformStat>;
}

// 定义上传文件类型
interface UploadFile {
  platform: Platform;
  fileName: string;
  filePath: string;
}

const s3UploadCommand: CommandMiddleware<WrapperContext> = async (ctx) => {
  await ctx.wait('正在准备上传图片到S3...');

  // 检查S3配置是否完整
  if (!ENABLE_S3_BACKUP || !S3_BUCKET_NAME || !S3_ENDPOINT) {
    return ctx.resolveWait('S3配置不完整或未启用，无法进行上传操作。');
  }

  // 定义目录路径
  const outputDir = path.resolve(process.cwd(), 'output');

  // 初始化统计数据
  const stats: UploadStats = {
    totalFiles: 0,
    uploadedFiles: 0,
    failedFiles: 0,
    totalSize: 0,
    platformStats: {
      pixiv: { files: 0, size: 0, success: 0, failed: 0 },
      twitter: { files: 0, size: 0, success: 0, failed: 0 },
    },
  };

  // 检查目录是否存在
  const validPlatforms: Platform[] = [];
  for (const platform of Object.values(Platform)) {
    const platformDir = path.join(outputDir, platform);
    if (fs.existsSync(platformDir)) {
      validPlatforms.push(platform);
    } else {
      await ctx.directlyReply(`目录 output/${platform} 不存在，将跳过该平台。`);
    }
  }

  if (validPlatforms.length === 0) {
    return ctx.resolveWait('没有找到有效的平台目录，上传操作取消。');
  }

  // 获取所有需要上传的文件
  const filesToUpload: UploadFile[] = [];
  for (const platform of validPlatforms) {
    const platformDir = path.join(outputDir, platform);
    const files = fs.readdirSync(platformDir).filter((file) => file.match(/\.(jpg|jpeg|png|gif|webp)$/i));

    stats.platformStats[platform].files = files.length;
    stats.totalFiles += files.length;

    for (const file of files) {
      filesToUpload.push({
        platform,
        fileName: file,
        filePath: path.join(platformDir, file),
      });
    }
  }

  if (filesToUpload.length === 0) {
    return ctx.resolveWait('没有找到需要上传的图片文件。');
  }

  await ctx.resolveWait(`找到 ${stats.totalFiles} 张图片需要上传，开始上传过程...`);

  // 上传进度更新间隔
  const progressInterval = Math.max(1, Math.floor(filesToUpload.length / 10));
  let lastProgressUpdate = 0;

  // 开始上传
  for (let i = 0; i < filesToUpload.length; i++) {
    const file = filesToUpload[i];
    if (!file) continue; // 跳过可能为undefined的元素

    const { platform, fileName, filePath } = file;

    try {
      // 读取文件
      const fileContent = fs.readFileSync(filePath);
      const fileSize = fileContent.length / 1024; // KB

      // 定义S3目标路径
      const s3Key = `${S3_OUTPUT_DIR}/${platform}/${fileName}`;

      // 上传文件到S3
      await uploadS3(fileContent, s3Key);

      // 更新统计数据
      stats.uploadedFiles++;
      stats.totalSize += fileSize;
      stats.platformStats[platform].size += fileSize;
      stats.platformStats[platform].success++;

      // 更新进度
      const currentProgress = i + 1;
      if (currentProgress - lastProgressUpdate >= progressInterval || currentProgress === filesToUpload.length) {
        const progressPercent = ((currentProgress / filesToUpload.length) * 100).toFixed(1);
        await ctx.resolveWait(`正在上传...已完成 ${currentProgress}/${filesToUpload.length} (${progressPercent}%)`);
        lastProgressUpdate = currentProgress;
      }

      logger.info(`上传成功: ${s3Key}, 文件大小: ${fileSize.toFixed(2)} KB`);
    } catch (error) {
      // 更新失败统计
      stats.failedFiles++;
      stats.platformStats[platform].failed++;

      logger.error(`上传失败: ${fileName}`, error);
    }
  }
  try {
    const downloadDir = DOWNLOAD_DIR;
    const downloadPixivDir = path.join(downloadDir, Platform.Pixiv);
    const downloadTwitterDir = path.join(downloadDir, Platform.Twitter);
    clearDirectory(downloadPixivDir);
    clearDirectory(downloadTwitterDir);
    logger.info('清理下载目录完成');
  } catch (error) {
    logger.error('清理下载目录失败', error);
  }
  // 构建上传结果消息
  const resultMessage = `上传完成!
总计:
- 总文件数: ${stats.totalFiles}
- 成功上传: ${stats.uploadedFiles}
- 上传失败: ${stats.failedFiles}
- 总大小: ${formatBytes(stats.totalSize * 1024)}

${validPlatforms
  .map((platform) => {
    const platformStat = stats.platformStats[platform];
    return `${platform} 平台:
- 文件数: ${platformStat.files}
- 成功: ${platformStat.success}
- 失败: ${platformStat.failed}
- 总大小: ${formatBytes(platformStat.size * 1024)}
`;
  })
  .join('\n')}`;

  return ctx.resolveWait(resultMessage);
};

/**
 * 格式化字节数为可读形式
 * @param bytes 字节数
 * @returns 格式化后的字符串
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default s3UploadCommand;
