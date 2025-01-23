import { WrapperContext } from '@/bot/wrappers/command-wrapper';
import { CommandType, OperateState } from '@/constants/enum';
import { getArtworks } from '@/utils/bot';
import { CommandMiddleware } from 'grammy';
import { parseOptions, processArtworks } from '../utils';
import { uploadS3 } from '@/utils/s3';
import { ENABLE_S3_BACKUP, S3_BUCKET_NAME, S3_PUBLIC_URL } from '@/constants';
import fs from 'fs';

const postCommand: CommandMiddleware<WrapperContext> = async (ctx: any) => {
  const args = ctx.command.args;
  if (!args?.length) return ctx.reply('请携带要发送的 url');

  const url = args.shift() ?? ''; // TODO: Url validation

  const option = parseOptions(args);

  const hasOtherOpt = args?.length > 0 && !args[0]?.includes('#');
  const customTags = args.slice(hasOtherOpt ? 1 : 0);

  const { state, msg, result: artworksInfo } = await getArtworks(url, CommandType.Post);

  if (state === OperateState.Fail) return ctx.reply(msg ?? 'unknown error', { parse_mode: 'HTML' });

  if (!artworksInfo?.length || !artworksInfo[0]) return ctx.reply('出错了？未找到合适的图片');

  await processArtworks(ctx, artworksInfo, option, customTags, CommandType.Post);

  // 上传数据库文件到 S3 备份
  if (ENABLE_S3_BACKUP) {
    try {
      const dbFile = fs.readFileSync('prisma/data.db');
      await uploadS3(dbFile, 'data.db');
      const s3Path = `${S3_PUBLIC_URL}/${S3_BUCKET_NAME}/data.db`;
      await ctx.reply(`数据库备份已上传至 [S3 ☁️](${s3Path})`, { parse_mode: 'MarkdownV2' });
    } catch (error: any) {
      console.error('上传数据库文件失败:', error);
      await ctx.reply(`数据库备份上传失败 ❌, 错误: \`\`\`\n${error?.message ?? '未知错误'}\n\`\`\``, {
        parse_mode: 'MarkdownV2',
      });
    }
  }

  return await ctx.deleteWaiting();
};

export default postCommand;
