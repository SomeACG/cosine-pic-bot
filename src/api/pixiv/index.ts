import path from 'path';
import { pixivInstance } from '../request/pixiv';
import { PixivAjaxResp, PixivIllust, PixivIllustPages } from '../types';
import { Artist, ImageSize } from '@/constants/types';

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
export default async function getPixivArtworkInfo(post_url: string): Promise<PixivArtInfo[]> {
  const pixiv_id = path.basename(post_url);
  console.log('======= pixiv_id =======\n', pixiv_id);
  const {
    data: { body: illust },
  } = await pixivInstance.get<PixivAjaxResp<PixivIllust>>('https://www.pixiv.net/ajax/illust/' + pixiv_id);

  console.log('======= illust =======\n', illust);
  const {
    data: { body: illust_pages },
  } = await pixivInstance.get<PixivAjaxResp<PixivIllustPages>>(`https://www.pixiv.net/ajax/illust/${pixiv_id}/pages?lang=zh`);
  if (!illust_pages?.length) return [];
  return illust_pages.map((item) => {
    const { urls, width, height } = item;
    const size = {
      width,
      height,
    };
    const tags = illust.tags.tags.map((item) => {
      if (item.tag === 'R-18') item.tag = 'R18';

      item.tag = item.translation?.en ? item.translation.en : item.tag;

      item.tag = item.tag.replace(/[\s"']/g, '_');

      return item.tag;
    });

    const illust_desc = illust.description
      // Remoie all the html tags in the description
      .replace(/<[^>]+>/g, '');

    const artworkInfo: PixivArtInfo = {
      post_url: post_url,
      title: illust.title,
      desc: illust_desc,
      url_thumb: urls.regular,
      url_origin: urls.original,
      size: size,
      raw_tags: tags,
      artist: {
        type: 'pixiv',
        uid: illust.userId,
        name: illust.userName,
      },
    };
    return artworkInfo;
  });
}
