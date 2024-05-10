// 谢谢 rex 提供的 twitter api 思路喵
import { FxTwitterResp } from '@/types/FxTwitter';
import request from '../request';

const FXTWITTER_API = 'https://api.fxtwitter.com/placeholder/status/';

export async function getTweetDetails(tweet_id: string) {
  const { data } = await request.get<FxTwitterResp>(FXTWITTER_API + tweet_id);
  if (data.code !== 200) throw new Error(data.message);
  return data.tweet;
}
