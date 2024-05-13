import { WrapperContext } from '@/bot/wrappers/command-wrapper';
import { OperateState } from '@/constants/enum';
import { chunkMedias } from '@/utils/batch';
import { getArtworks } from '@/utils/bot';
import { CommandMiddleware } from 'grammy';
import { echoPostMedia } from './postMedia';
import { ArtworkInfo } from '@/types/Artwork';

// /echo url [?batch_?page] [?#tag1] [?#tag2]
// eg: /echo https://www.pixiv.net/artworks/118299613 0_0  #tag1 #tag2 跟没传一样效果，尝试全发
// eg: /echo https://www.pixiv.net/artworks/118299613 3_2  #tag1 #tag2 // 第3批的第2张
// eg: /echo https://www.pixiv.net/artworks/118299613 0_3  #tag1 #tag2 // 每批的第3张
// eg: /echo https://www.pixiv.net/artworks/118299613 3_0  #tag1 #tag2 // 第3批的所有张
// page 为 0 表示该批次所有图，batch 为 0 表示所有批次，page 为 1 表示第 batch 的第1张
const echoCommand: CommandMiddleware<WrapperContext> = async (ctx) => {
  const args = ctx.command.args;
  if (!args?.length) return ctx.reply('请携带要预览的 url');

  const url = args[0] ?? ''; // TODO: Url validation
  const { state, msg, result: artworksInfo } = await getArtworks(url);

  const option = { batch: 0, page: 0 };

  try {
    if (args?.length > 1 && !args[1]?.includes('#')) {
      const [batch, size] = args?.[1]?.split('_') ?? [];
      option.batch = Number(batch) ?? 0;
      option.page = Number(size) ?? 0;
    }
  } catch (e) {
    ctx.reply('参数有误！');
  }

  if (state === OperateState.Fail) return ctx.reply(msg ?? 'unknown error', { parse_mode: 'HTML' });

  if (!artworksInfo?.length || !artworksInfo[0]) return ctx.reply('出错了？未找到合适的图片');

  await ctx.wait('正在获取图片信息并下载图片，请稍后~~');

  // console.log('======= option =======\n', option);

  const { totalPage, res: chunkRes } = chunkMedias(artworksInfo);
  // console.log('======= totalPage =======\n', totalPage);
  // console.log('======= chunkRes =======\n', chunkRes);

  if (!option.batch) {
    if (!option.page) {
      // 0_0
      // 全发
      for (let page = 0; page < totalPage; page++) {
        const artworks = chunkRes[page];
        await echoPostMedia(ctx, artworks ?? [], page, totalPage);
      }
      // console.log('======= 全发 artworks =======\n');
    } else {
      // 0_1 / 0_2... 发每批的第 page 张
      const artworks = [];
      for (let i = 0; i < totalPage; i++) {
        if (chunkRes?.[i]?.[option.page - 1]) {
          artworks.push(chunkRes[i]![option.page - 1] as ArtworkInfo);
        }
      }
      await echoPostMedia(ctx, artworks);
      // console.log(`======= 发每批的第 ${option.page} 张 artworks =======\n`, artworks);
    }
  } else {
    // batch 1 / 2 /3....
    if (totalPage < option.batch) {
      ctx.reply('参数无效，超出范围!');
      await ctx.deleteWaiting();
      return;
    }
    if (!option.page) {
      // 1_0 2_0 ....
      // 发第batch的全部
      const target = chunkRes[option.batch - 1] ?? [];
      await echoPostMedia(ctx, target);
      // console.log(`======= 发第 ${option.batch} 的全部 =======\n`, target);
    } else {
      // 1_1 / 2_2 ....
      // 发第 batch 批的第 page 张
      if (option.page - 1 >= (chunkRes?.[option.batch - 1]?.length ?? 0)) {
        ctx.reply('参数无效，超出范围!');
        await ctx.deleteWaiting();
        return;
      }
      const target = [chunkRes?.[option.batch - 1]?.[option.page - 1]] as ArtworkInfo[];
      await echoPostMedia(ctx, target);
      // console.log(`======= 发第 ${option.batch} 批的第 ${option.page} 张 =======\n`, target);
    }
  }

  return await ctx.deleteWaiting();
};

export default echoCommand;
