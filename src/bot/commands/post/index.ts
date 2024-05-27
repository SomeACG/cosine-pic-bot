import { WrapperContext } from '@/bot/wrappers/command-wrapper';
import { CommandType, OperateState } from '@/constants/enum';
import { getArtworks } from '@/utils/bot';
import { CommandMiddleware } from 'grammy';
import { parseOptions, processArtworks } from '../utils';

const postCommand: CommandMiddleware<WrapperContext> = async (ctx) => {
  const args = ctx.command.args;
  if (!args?.length) return ctx.reply('请携带要预览的 url');

  const url = args.shift() ?? ''; // TODO: Url validation

  const option = parseOptions(args);

  const hasOtherOpt = args?.length > 0 && !args[0]?.includes('#');
  const customTags = args.slice(hasOtherOpt ? 1 : 0);

  const { state, msg, result: artworksInfo } = await getArtworks(url, CommandType.Post);

  if (state === OperateState.Fail) return ctx.reply(msg ?? 'unknown error', { parse_mode: 'HTML' });

  if (!artworksInfo?.length || !artworksInfo[0]) return ctx.reply('出错了？未找到合适的图片');

  await processArtworks(ctx, artworksInfo, option, customTags, CommandType.Post);

  return await ctx.deleteWaiting();
};

export default postCommand;
