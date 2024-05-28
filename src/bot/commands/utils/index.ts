import { WrapperContext } from '@/bot/wrappers/command-wrapper';
import { ArtworkInfo } from '@/types/Artwork';
import { chunkMedias } from '@/utils/batch';
import { CommandContext } from 'grammy';
import { postMedia } from './postMedia';
import { CommandType } from '@/constants/enum';
import { saveArtworkInfo } from '@/utils/bot';
import { PostUserInfo } from '@/types/User';

// Helper function to parse options from arguments
export const parseOptions = (args?: string[]): { batch: number; page: number; batchSize: number } => {
  try {
    const option = { batch: 0, page: 0, batchSize: 6 };
    if (args?.length && !args[0]?.includes('#')) {
      const [batch, page, batchSize] = args.shift()?.split(/[,/_-]/) ?? [];
      option.batch = Number(batch) ?? 0;
      option.page = Number(page) ?? 0;
      option.batchSize = Number(batchSize) ?? 6;
    }
    return option;
  } catch (e) {
    throw Error('参数有误！');
  }
};

// Helper function to validate and process artworks
export const processArtworks = async (
  ctx: CommandContext<WrapperContext>,
  artworksInfo: ArtworkInfo[],
  option: { batch: number; page: number; batchSize: number },
  customTags: string[],
  cmdType: CommandType = CommandType.Echo,
) => {
  if (cmdType !== CommandType.Submit) await ctx.wait('正在获取图片信息并下载图片，请稍等~~');
  try {
    const { batch, page, batchSize } = option;
    const { totalPage, res: chunkRes } = chunkMedias(artworksInfo, batchSize);
    const from = cmdType === CommandType.Submit ? ctx.update.callback_query?.message?.reply_to_message?.from : ctx?.from;
    const userID = from?.id;
    const username = from?.username;
    const userInfo: PostUserInfo = {
      userid: userID ? BigInt(userID) : undefined,
      username: username ? `@${username}` : undefined,
    };
    const commonOpts = { ctx, customTags, option, totalPage, cmdType, userInfo };
    console.log('======= userInfo =======\n', userInfo);
    if ([CommandType.Post, CommandType.Submit].includes(cmdType)) saveArtworkInfo(artworksInfo, userInfo);

    if (!batch) {
      if (!page) {
        // 0_0
        // 全发
        for (let page = 0; page < totalPage; page++) {
          const artworks = chunkRes[page];
          await postMedia({ ...commonOpts, artworks: artworks ?? [], currentPage: page });
        }
        // console.log('======= 全发 artworks =======\n');
      } else {
        // 0_1 / 0_2... 发每批的第 page 张
        const artworks = [];
        for (let i = 0; i < totalPage; i++) {
          if (chunkRes?.[i]?.[page - 1]) {
            artworks.push(chunkRes[i]![page - 1] as ArtworkInfo);
          }
        }
        await postMedia({ ...commonOpts, artworks });
        // console.log(`======= 发每批的第 ${page} 张 artworks =======\n`, artworks);
      }
    } else {
      // batch 1 / 2 /3....
      if (totalPage < batch) {
        throw Error(
          `batch 参数无效， page 超出范围! 共 ${totalPage} 批次（每批${batchSize}），指定了第 ${batch} 批次第 ${page} 张`,
        );
      }
      if (!page) {
        // 1_0 2_0 ....
        // 发第batch的全部
        const target = chunkRes[batch - 1] ?? [];
        await postMedia({ ...commonOpts, artworks: target });
        // console.log(`======= 发第 ${batch} 的全部 =======\n`, target);
      } else {
        // 1_1 / 2_2 ....
        // 发第 batch 批的第 page 张
        if (page - 1 >= (chunkRes?.[batch - 1]?.length ?? 0)) {
          throw Error(
            `batch 参数无效， page 超出范围! 共 ${totalPage} 批次（每批${batchSize}），指定了第 ${batch} 批次第 ${page} 张`,
          );
        }
        const target = [chunkRes?.[batch - 1]?.[page - 1]] as ArtworkInfo[];
        await postMedia({ ...commonOpts, artworks: target });
        // console.log(`======= 发第 ${batch} 批的第 ${page} 张 =======\n`, target);
      }
    }
  } catch (e: any) {
    await ctx.deleteWaiting();
    throw Error(e?.message ?? '处理图片时出错! Error in processArtworks!');
  }
};
