import { WrapperContext } from '@/bot/wrappers/command-wrapper';
import { OperateState } from '@/constants/enum';
import { getArtworks } from '@/utils/bot';
import { CommandMiddleware } from 'grammy';
import { parseOptions, processArtworks } from '../utils';

// /echo url [?batch_?page] [?#tag1] [?#tag2]
// eg: /echo https://www.pixiv.net/artworks/118299613 0_0  #tag1 #tag2 跟没传一样效果，尝试全发
// eg: /echo https://www.pixiv.net/artworks/118299613 3_2  #tag1 #tag2 // 第3批的第2张
// eg: /echo https://www.pixiv.net/artworks/118299613 0_3  #tag1 #tag2 // 每批的第3张
// eg: /echo https://www.pixiv.net/artworks/118299613 3_0  #tag1 #tag2 // 第3批的所有张
// page 为 0 表示该批次所有图，batch 为 0 表示所有批次，page 为 1 表示第 batch 的第1张
const echoCommand: CommandMiddleware<WrapperContext> = async (ctx) => {
  const args = ctx.command.args;
  if (!args?.length) return ctx.reply('请携带要预览的 url');

  const url = args.shift() ?? ''; // TODO: Url validation

  const option = parseOptions(args);

  const hasOtherOpt = args?.length > 0 && !args[0]?.includes('#');
  const customTags = args.slice(hasOtherOpt ? 1 : 0);

  const { state, msg, result: artworksInfo } = await getArtworks(url);

  if (state === OperateState.Fail) return ctx.reply(msg ?? 'unknown error', { parse_mode: 'HTML' });

  if (!artworksInfo?.length || !artworksInfo[0]) return ctx.reply('出错了？未找到合适的图片');

  await processArtworks(ctx, artworksInfo, option, customTags);

  return await ctx.deleteWaiting();
};

export default echoCommand;
