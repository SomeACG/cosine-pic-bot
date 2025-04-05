import { WrapperContext } from '@/bot/wrappers/command-wrapper';
import { DOWNLOAD_DIR } from '@/constants';
import { Platform } from '@/constants/enum';
import { clearDirectory, fsExistOrCreate } from '@/utils/fs';
import { getFileSize } from '@/utils/image';
import logger from '@/utils/logger';
import { Transformer } from '@napi-rs/image';
import fs from 'fs';
import { CommandMiddleware } from 'grammy';
import path from 'path';

type CompressStats = {
  platform: Platform;
  fileCount: number;
  originalSize: number;
  compressedSize: number;
};

const compressCommand: CommandMiddleware<WrapperContext> = async (ctx) => {
  // 检查输出目录是否存在，不存在则创建
  const outputDir = path.resolve(process.cwd(), 'output');
  const outputPixivDir = path.join(outputDir, Platform.Pixiv);
  const outputTwitterDir = path.join(outputDir, Platform.Twitter);

  if (!fsExistOrCreate(outputDir)) {
    return ctx.reply('创建输出目录失败');
  }
  fsExistOrCreate(outputPixivDir);
  fsExistOrCreate(outputTwitterDir);

  // 清理输出目录中的现有文件
  await ctx.wait('开始清理输出目录...');
  clearDirectory(outputPixivDir);
  clearDirectory(outputTwitterDir);
  await ctx.resolveWait('输出目录清理完成');

  // 获取源目录路径
  const pixivDir = path.join(DOWNLOAD_DIR, Platform.Pixiv);
  const twitterDir = path.join(DOWNLOAD_DIR, Platform.Twitter);

  await ctx.resolveWait('开始压缩图片...');
  // resolveWait progress 不要太频繁
  // 压缩Pixiv图片
  const pixivStats = await compressImages(pixivDir, outputPixivDir, Platform.Pixiv, ctx);

  // 压缩Twitter图片
  const twitterStats = await compressImages(twitterDir, outputTwitterDir, Platform.Twitter, ctx);

  // 汇总统计信息
  const totalOriginalSize = pixivStats.originalSize + twitterStats.originalSize;
  const totalCompressedSize = pixivStats.compressedSize + twitterStats.compressedSize;
  const totalFiles = pixivStats.fileCount + twitterStats.fileCount;
  const compressionRatio = totalOriginalSize > 0 ? (totalCompressedSize / totalOriginalSize) * 100 : 0;
  const savedSpace = totalOriginalSize - totalCompressedSize;

  // 构建统计信息消息
  const message = `
压缩完成！统计信息如下：

Pixiv:
- 文件数: ${pixivStats.fileCount}
- 原始大小: ${(pixivStats.originalSize / 1024).toFixed(2)} MB
- 压缩后大小: ${(pixivStats.compressedSize / 1024).toFixed(2)} MB
- 压缩率: ${pixivStats.originalSize > 0 ? ((pixivStats.compressedSize / pixivStats.originalSize) * 100).toFixed(2) : 0}%

Twitter:
- 文件数: ${twitterStats.fileCount}
- 原始大小: ${(twitterStats.originalSize / 1024).toFixed(2)} MB
- 压缩后大小: ${(twitterStats.compressedSize / 1024).toFixed(2)} MB
- 压缩率: ${twitterStats.originalSize > 0 ? ((twitterStats.compressedSize / twitterStats.originalSize) * 100).toFixed(2) : 0}%

总计:
- 总文件数: ${totalFiles}
- 总原始大小: ${(totalOriginalSize / 1024).toFixed(2)} MB
- 总压缩后大小: ${(totalCompressedSize / 1024).toFixed(2)} MB
- 总压缩率: ${compressionRatio.toFixed(2)}%
- 节省空间: ${(savedSpace / 1024).toFixed(2)} MB

压缩后的图片保存在 output 目录下
`;

  return ctx.resolveWait(message);
};

/**
 * 压缩指定目录下的所有图片
 * @param sourceDir 源目录
 * @param outputDir 输出目录
 * @param platform 平台类型
 * @param ctx 上下文，用于发送进度消息
 * @returns 压缩统计信息
 */
async function compressImages(
  sourceDir: string,
  outputDir: string,
  platform: Platform,
  ctx: WrapperContext,
): Promise<CompressStats> {
  const stats: CompressStats = {
    platform,
    fileCount: 0,
    originalSize: 0,
    compressedSize: 0,
  };

  if (!fs.existsSync(sourceDir)) {
    logger.info(`源目录不存在: ${sourceDir}`);
    return stats;
  }

  const files = fs.readdirSync(sourceDir).filter((file) => file.match(/\.(jpg|jpeg|png|gif|webp)$/i));

  const totalFiles = files.length;
  const progressInterval = 5; // 每处理 5 个文件显示一次进度
  let processedCount = 0;

  for (const file of files) {
    try {
      const sourcePath = path.join(sourceDir, file);
      const outputPath = path.join(outputDir, file.replace(/\.\w+$/, '.webp'));

      // 读取图片文件
      const imageBuffer = fs.readFileSync(sourcePath);
      const originalSizeKB = await getFileSize(imageBuffer);
      stats.originalSize += originalSizeKB;

      // 压缩图片
      const transformer = new Transformer(imageBuffer);
      const compressedImageBuffer = await transformer.webp(80);

      // 写入压缩后的图片
      fs.writeFileSync(outputPath, compressedImageBuffer);

      // 计算压缩后的大小
      const compressedSizeKB = await getFileSize(compressedImageBuffer);
      stats.compressedSize += compressedSizeKB;
      stats.fileCount++;

      // 增加处理计数
      processedCount++;

      // 每隔一定数量的文件显示进度
      if (processedCount % progressInterval === 0 || processedCount === totalFiles) {
        const progress = ((processedCount / totalFiles) * 100).toFixed(1);
        await ctx.resolveWait(`正在压缩 ${platform} 图片... ${processedCount}/${totalFiles} (${progress}%)`);
      }

      logger.info(`压缩图片: ${file}, 原始大小: ${originalSizeKB.toFixed(2)} KB, 压缩后: ${compressedSizeKB.toFixed(2)} KB`);
    } catch (error) {
      logger.error(`压缩图片时出错: ${file}`, error);
    }
  }

  return stats;
}

export default compressCommand;
