import { Platform } from '@/constants/enum';
import { ImageSize } from '@/constants/types';
import { Artist, ArtworkInfo } from '@/types/Artwork';
import { PixivAjaxResp, PixivIllust, PixivIllustPages } from '@/types/pixiv';
import path from 'path';
import pixivRequest from '../request/pixiv';

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
    const tags = illust.tags.tags.map((item) => {
      if (item.tag === 'R-18') item.tag = 'R18';

      item.tag = item.translation?.en ? item.translation.en : item.tag;

      item.tag = item.tag.replace(/[\s"']/g, '_');

      return item.tag;
    });

    const illust_desc = illust.description
      // Remove all the html tags in the description
      .replace(/<[^>]+>/g, '');

    const artworkInfo: ArtworkInfo = {
      source_type: Platform.Pixiv,
      post_url: post_url,
      title: illust.title,
      desc: illust_desc,
      url_thumb: urls.regular,
      url_origin: urls.original,
      size: size,
      raw_tags: tags,
      artist: {
        type: Platform.Pixiv,
        uid: illust.userId,
        name: illust.userName,
      },
    };
    return artworkInfo;
  });
}
