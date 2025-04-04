import { WrapperContext } from '@/bot/wrappers/command-wrapper';
import { ENABLE_S3_BACKUP, S3_BUCKET_NAME, S3_ENDPOINT, S3_PUBLIC_URL, S3_REGION } from '@/constants';
import logger from '@/utils/logger';
import s3 from '@/utils/s3';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { CommandMiddleware } from 'grammy';

const s3InfoCommand: CommandMiddleware<WrapperContext> = async (ctx) => {
  // 显示S3配置信息
  await ctx.wait('正在获取S3配置信息...');

  // 构建配置信息消息
  const configMessage = `
S3 配置信息如下：

- 启用 S3 备份: ${ENABLE_S3_BACKUP ? '是' : '否'}
- 存储桶名称: ${S3_BUCKET_NAME || '未设置'}
- 终端节点: ${S3_ENDPOINT || '未设置'}
- 区域: ${S3_REGION || '未设置'}
- 公共URL: ${S3_PUBLIC_URL || '未设置'}
  `;

  await ctx.directlyReply(configMessage);

  // 如果S3配置有效，测试连接
  if (!S3_BUCKET_NAME || !S3_ENDPOINT) {
    return ctx.reply('S3 配置不完整，无法进行连接测试。');
  }

  await ctx.resolveWait('正在测试 S3 连接...');

  try {
    // 尝试列出存储桶中的对象
    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET_NAME,
      MaxKeys: 10,
    });

    const response = await s3.send(command);

    // 构建连接测试结果消息
    let testMessage = '连接测试成功! ✅\n\n';

    if (response.Contents && response.Contents.length > 0) {
      testMessage += `存储桶中共有 ${response.KeyCount} 个对象，前 ${Math.min(response.Contents.length, 10)} 个对象：\n`;
      response.Contents.slice(0, 10).forEach((item, index) => {
        testMessage += `${index + 1}. ${item.Key} (${formatBytes(item.Size || 0)})\n`;
      });
    } else {
      testMessage += '存储桶为空。';
    }

    return ctx.resolveWait(testMessage);
  } catch (error: any) {
    logger.error('S3连接测试失败:', error);
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
