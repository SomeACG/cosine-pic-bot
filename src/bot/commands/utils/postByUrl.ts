import { CommandType, OperateState } from '@/constants/enum';
import { getArtworks } from '@/utils/bot';
import { parseOptions, processArtworks } from '.';

const postByUrl = async (ctx: any, url: string) => {
  const option = parseOptions();

  const { state, msg, result: artworksInfo } = await getArtworks(url, CommandType.Post);

  if (state === OperateState.Fail) return ctx.reply(msg ?? 'unknown error', { parse_mode: 'HTML' });

  if (!artworksInfo?.length || !artworksInfo[0]) return ctx.reply('出错了？未找到合适的图片');

  await processArtworks(ctx, artworksInfo, option, [], CommandType.Submit);

  return await ctx.deleteWaiting();
};

export default postByUrl;
