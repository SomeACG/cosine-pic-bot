import { getTweetDetails } from '../api/twitter-web-api/fxtwitter';
import { getUserByUsername } from '../api/twitter-web-api/tweet';
import { describe, expect, test } from '@jest/globals';

describe('Twitter Web API Test', () => {
  test('Get Tweet Details', async () => {
    const tweet = await getTweetDetails('1614089157323952132');
    expect(tweet?.author?.id).toBe('829606036948475904');
  });

  test('Get User By Username', async () => {
    const user = await getUserByUsername('majotabi_PR');
    expect(user.screen_name).toBe('majotabi_PR');
  });

  test('Get Tweet Media', async () => {
    const tweet = await getTweetDetails('1653719799011360769');
    expect(tweet?.media?.photos?.[0]?.type).toBe('photo');
  });
});
