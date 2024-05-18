import { Platform } from '@/constants/enum';
import { ImageSize } from '@/constants/types';
import { Artist, ArtworkInfo } from '@/types/Artwork';
import { PixivAjaxResp, PixivIllust, PixivIllustPages } from '@/types/pixiv';
import path from 'path';
import pixivRequest from '../request/pixiv';
import { getUrlFileExtension } from '@/utils/image';
import { unique } from '@/utils';
export type PixivArtInfo = {
  post_url: string;
  title: string;
  desc: string;
  url_thumb: string;
  url_origin: string;
  size: ImageSize;
  raw_tags: string[];
  artist: Artist;
};
export default async function getPixivArtworkInfo(post_url: string): Promise<ArtworkInfo[]> {
  const pixiv_id = path.basename(post_url);
  const {
    data: { body: illust },
  } = await pixivRequest.get<PixivAjaxResp<PixivIllust>>('https://www.pixiv.net/ajax/illust/' + pixiv_id);

  const {
    data: { body: illust_pages },
  } = await pixivRequest.get<PixivAjaxResp<PixivIllustPages>>(`https://www.pixiv.net/ajax/illust/${pixiv_id}/pages?lang=zh`);
  if (!illust_pages?.length) return [];
  return illust_pages.map((item) => {
    const { urls, width, height } = item;
    const size = {
      width,
      height,
    };
    const rawTags = illust?.tags?.tags?.length
      ? unique(
          illust.tags.tags.map((item) => {
            if (item.tag === 'R-18') item.tag = 'R18';
            console.log('======= rawTag tag =======\n', item.tag);
            const invalidReg = // eslint-disable-next-line no-irregular-whitespace
              /[\s!"$%&'()*+,-./:;<=>?@[\]^`{|}~．！？｡。＂＃＄％＆＇（）＊＋, －／：；＜＝＞＠［＼］＾＿｀｛｜｝～｟｠｢｣､　、〃〈〉《》「」『』【】〔〕〖〗〘〙〚〛〜〝〞〟〰〾〿–—‘’‛“”„‟…‧﹏﹑﹔·]/g;
            item.tag = item.tag?.replace(invalidReg, '');
            const translatedTag = item.translation?.en?.replace(invalidReg, '') ?? '';

            // https://github.com/xuejianxianzun/PixivBatchDownloader/blob/397c16670bb480810d93bba70bb784bd0707bdee/src/ts/Tools.ts#L399
            // 如果翻译后的标签是纯英文, 则判断原标签是否含有至少一部分中文, 如果是则使用原标签
            // 这是为了解决一些中文标签被翻译成英文的问题, 如 原神 被翻译为 Genshin Impact
            // 能代(アズールレーン) Noshiro (Azur Lane) 也会使用原标签
            // 但是如果原标签里没有中文则依然会使用翻译后的标签, 如 フラミンゴ flamingo
            // if (!/^[\u4e00-\u9fff]+$/.test(item.tag) && item?.translation?.en) item.tag = item.translation.en;
            // console.log('======= rawTag mid =======\n', item.tag);
            const chineseRegexp = /[\u4e00-\u9fff]/;
            const allEnglish = [].every.call(translatedTag, function (s: string) {
              return s.charCodeAt(0) < 128;
            });
            if (!allEnglish || !chineseRegexp.test(item.tag)) {
              if (translatedTag) item.tag = translatedTag;
            }
            return item.tag;
          }),
        )
      : [];

    const illust_desc = illust.description
      // Remove all the html tags in the description
      .replace(/<[^>]+>/g, '');

    const extension = getUrlFileExtension(urls.original);

    const artworkInfo: ArtworkInfo = {
      pid: illust.id,
      source_type: Platform.Pixiv,
      post_url: post_url,
      title: illust.title,
      desc: illust_desc.slice(0, 230) + (illust_desc.length > 230 ? '...' : ''), // 超过230字自动截断
      url_thumb: urls.regular,
      url_origin: urls.original,
      size: size,
      raw_tags: rawTags,
      extension: extension ?? 'jpg',
      artist: {
        type: Platform.Pixiv,
        uid: illust.userId,
        name: illust.userName,
      },
    };
    return artworkInfo;
  });
}
