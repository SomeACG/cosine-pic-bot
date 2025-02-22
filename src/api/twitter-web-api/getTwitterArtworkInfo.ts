import { OperateState, Platform } from '@/constants/enum';
import { ArtworkInfo } from '@/types/Artwork';
import { getTweetDetails } from './fxtwitter';
import { getUrlFileExtension } from '@/utils/image';

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
  const raw_tags = desc.match(/#([\p{L}\p{N}_-]+)/gu) ?? [];

  if (!photos?.length) return noFound;

  return {
    state: OperateState.Success,
    result: photos.map((photo) => ({
      pid: tweet.id,
      source_type: Platform.Twitter,
      post_url: post_url,
      desc,
      url_thumb: photo.url + '?name=medium',
      url_origin: photo.url + '?name=orig',
      extension: getUrlFileExtension(photo.url) ?? 'jpg',
      custom_tags: customTags ?? [],
      raw_tags,
      size: {
        width: photo.width,
        height: photo.height,
      },
      artist: {
        type: Platform.Twitter,
        name: tweet.author.name,
        uid: tweet.author.id,
        username: tweet.author.screen_name,
      },
    })),
  };
}
