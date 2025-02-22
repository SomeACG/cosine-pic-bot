import { WrapperContext } from '@/bot/wrappers/command-wrapper';
import { CommandType, OperateState } from '@/constants/enum';
import { getArtworks } from '@/utils/bot';
// import { backupDBToS3IfEnabled } from '@/utils/s3';
import { CommandMiddleware } from 'grammy';
import { parseOptions, processArtworks } from '../utils';

const postCommand: CommandMiddleware<WrapperContext> = async (ctx: any) => {
  const args = ctx.command.args;
  if (!args?.length) return ctx.reply('请携带要发送的 url');

  const url = args.shift() ?? ''; // TODO: Url validation

  const option = parseOptions(args);

  const hasOtherOpt = args?.length > 0 && !args[0]?.includes('#');
  const customTags = args.slice(hasOtherOpt ? 1 : 0);

  const { state, msg, result: artworksInfo } = await getArtworks(url, CommandType.Post, customTags);

  if (state === OperateState.Fail) return ctx.reply(msg ?? 'unknown error', { parse_mode: 'HTML' });

  if (!artworksInfo?.length || !artworksInfo[0]) return ctx.reply('出错了？未找到合适的图片');

  await processArtworks(ctx, artworksInfo, option, customTags, CommandType.Post);

  // await backupDBToS3IfEnabled(ctx);
  return await ctx.deleteWaiting();
};

export default postCommand;
