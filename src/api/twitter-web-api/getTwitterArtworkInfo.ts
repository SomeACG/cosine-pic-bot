import { OperateState, Platform } from '@/constants/enum';
import { ArtworkInfo } from '@/types/Artwork';
import { getTweetDetails } from './fxtwitter';
import { getUrlFileExtension } from '@/utils/image';
import { uniq } from 'es-toolkit';
import logger from '@/utils/logger';

function getUrlWithoutQuery(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    return u.origin + u.pathname;
  } catch {
    const q = rawUrl.indexOf('?');
    return q === -1 ? rawUrl : rawUrl.slice(0, q);
  }
}

function buildTwitterImageUrl(rawUrl: string, name: 'orig' | 'medium'): string {
  try {
    const u = new URL(rawUrl);
    u.search = '';
    u.searchParams.set('name', name);
    return u.toString();
  } catch {
    const q = rawUrl.indexOf('?');
    const noQuery = q === -1 ? rawUrl : rawUrl.slice(0, q);
    return `${noQuery}?name=${name}`;
  }
}

export default async function getTwitterArtworkInfo(
  post_url: string,
  customTags?: string[],
): Promise<{ state: OperateState; msg?: string; result?: ArtworkInfo[] }> {
  const match = post_url.match(/status\/(\d+)/);
  const noFound = {
    state: OperateState.Fail,
    msg: '此推文中没有任何图片!',
  };
  if (!match?.length) return noFound;

  const tweet = await getTweetDetails(match[1] ?? '');

  // console.log('======= tweet =======\n');
  // console.dir(tweet);

  // Remove t.co Links
  const desc = tweet.text.replace(/https:\/\/t.co\/(\w+)/, '');
  const photos = tweet?.media?.photos;
  const custom_tags = uniq(customTags ?? []);
  const isR18 = tweet?.possibly_sensitive;
  const r18Tags = isR18 ? ['#nsfw'] : [];
  const matchTags: string[] = desc.match(/#([\p{L}\p{N}_-]+)/gu) ?? [];
  const raw_tags = uniq(matchTags.concat(r18Tags));
  logger.info('photos:' + photos + ' tweet:' + tweet);
  if (!photos?.length) return noFound;
  return {
    state: OperateState.Success,
    result: photos.map((photo) => {
      const baseUrl = getUrlWithoutQuery(photo.url);
      return {
        pid: tweet.id,
        source_type: Platform.Twitter,
        post_url: post_url,
        desc,
        url_thumb: buildTwitterImageUrl(baseUrl, 'medium'),
        url_origin: buildTwitterImageUrl(baseUrl, 'orig'),
        extension: getUrlFileExtension(baseUrl) ?? 'jpg',
        custom_tags,
        raw_tags,
        size: {
          width: photo.width,
          height: photo.height,
        },
        r18: tweet?.possibly_sensitive,
        artist: {
          type: Platform.Twitter,
          name: tweet.author.name,
          uid: tweet.author.id,
          username: tweet.author.screen_name,
        },
      };
    }),
  };
}
