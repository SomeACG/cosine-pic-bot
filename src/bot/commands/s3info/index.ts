import { WrapperContext } from '@/bot/wrappers/command-wrapper';
import { S3_BUCKET_NAME, S3_ENDPOINT, S3_OUTPUT_DIR } from '@/constants';
import { Platform } from '@/constants/enum';
import logger from '@/utils/logger';
import s3 from '@/utils/s3';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { format, isSameDay, isToday, isValid, parse } from 'date-fns';
import { CommandMiddleware } from 'grammy';

/**
 * 为指定平台获取指定日期上传的S3文件
 */
async function getFilesForPlatform(
  platform: Platform,
  targetDate?: Date,
): Promise<Array<{ key: string; size: number; lastModified: Date }>> {
  const command = new ListObjectsV2Command({
    Bucket: S3_BUCKET_NAME,
    Prefix: `${S3_OUTPUT_DIR}/${platform}/`,
    MaxKeys: 1000,
  });

  const response = await s3.send(command);
  const files: Array<{ key: string; size: number; lastModified: Date }> = [];

  if (response.Contents) {
    response.Contents.forEach((item) => {
      if (!item.Key || !item.LastModified || !item.Size) return;

      // 如果提供了目标日期，检查是否为目标日期上传，否则检查是否为今日上传
      if (targetDate ? isSameDay(item.LastModified, targetDate) : isToday(item.LastModified)) {
        files.push({
          key: item.Key,
          size: item.Size,
          lastModified: item.LastModified,
        });
      }
    });
  }

  // 按最后修改时间排序（最新的在前）
  return files.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
}

const s3InfoCommand: CommandMiddleware<WrapperContext> = async (ctx) => {
  // 解析日期参数
  let targetDate: Date | undefined;
  const dateArg = ctx.command.args[0];

  if (dateArg) {
    // 尝试解析日期，支持 YYYY-MM-DD 格式
    targetDate = parse(dateArg, 'yyyy-MM-dd', new Date());

    if (!isValid(targetDate)) {
      return ctx.reply('日期格式无效，请使用 YYYY-MM-DD 格式，例如: /s3info 2023-11-30');
    }
  }

  // 显示S3配置信息
  const dateDisplay = targetDate ? format(targetDate, 'yyyy-MM-dd') : '今日';
  await ctx.wait(`正在获取 ${dateDisplay} 的S3上传信息...`);

  //   // 构建配置信息消息
  //   const configMessage = `
  // S3 配置信息如下：

  // - 启用 S3 备份: ${ENABLE_S3_BACKUP ? '是' : '否'}
  // - 存储桶名称: ${S3_BUCKET_NAME || '未设置'}
  // - 终端节点: ${S3_ENDPOINT || '未设置'}
  // - 区域: ${S3_REGION || '未设置'}
  // - 公共URL: ${S3_PUBLIC_URL || '未设置'}
  //   `;

  //   await ctx.directlyReply(configMessage);

  // 如果S3配置有效，测试连接
  if (!S3_BUCKET_NAME || !S3_ENDPOINT) {
    return ctx.reply('S3 配置不完整，无法进行连接测试。');
  }

  await ctx.resolveWait(`正在测试 S3 连接并获取 ${dateDisplay} 的上传数据...`);

  try {
    // 按平台分类上传的图片
    const platformFiles: Record<Platform, Array<{ key: string; size: number; lastModified: Date }>> = {
      [Platform.Pixiv]: [],
      [Platform.Twitter]: [],
    };

    // 分别获取每个平台的数据
    try {
      platformFiles[Platform.Pixiv] = await getFilesForPlatform(Platform.Pixiv, targetDate);
    } catch (error) {
      logger.error('获取 Pixiv 平台数据失败:', error);
      platformFiles[Platform.Pixiv] = [];
    }

    try {
      platformFiles[Platform.Twitter] = await getFilesForPlatform(Platform.Twitter, targetDate);
    } catch (error) {
      logger.error('获取 Twitter 平台数据失败:', error);
      platformFiles[Platform.Twitter] = [];
    }

    // 计算总上传数量
    const totalFiles = platformFiles[Platform.Pixiv].length + platformFiles[Platform.Twitter].length;

    if (totalFiles === 0) {
      return ctx.resolveWait(`连接测试成功! ✅\n\n${dateDisplay} 无任何上传。`);
    }

    // 构建结果消息
    let resultMessage = '测试成功! ✅\n\n';

    // 添加每个平台的统计信息
    for (const platform of Object.values(Platform)) {
      const files = platformFiles[platform];

      resultMessage += `【${platform}】平台:\n`;
      resultMessage += `${dateDisplay} 上传: ${files.length} 张图片\n`;

      if (files.length > 0) {
        resultMessage += `最近 5 张图片:\n`;
        files.slice(0, 5).forEach((file, index) => {
          const fileName = file.key.split('/').pop() || file.key;
          resultMessage += `${index + 1}. ${fileName} (${formatBytes(file.size)}) - 上传时间: ${format(
            file.lastModified,
            'yyyy-MM-dd HH:mm:ss',
          )}\n`;
        });
      }

      resultMessage += '\n';
    }

    // 添加总计
    resultMessage += `${dateDisplay}总上传数量: ${totalFiles} 张图片`;

    return ctx.resolveWait(resultMessage);
  } catch (error: any) {
    logger.error('S3 连接测试失败:', error);
    const errorMessage = `连接测试失败! ❌\n错误信息: ${error?.message || '未知错误'}`;
    return ctx.resolveWait(errorMessage);
  }
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

export default s3InfoCommand;
