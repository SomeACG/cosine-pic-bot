// https://github.com/FxEmbed/FxEmbed/blob/main/src/types/types.d.ts
// 感谢 FxEmbed 提供的 Twitter API 类型
// 简化后

/* This file contains types relevant to FixTweet and the FixTweet API
   For Twitter API types, see twitterTypes.d.ts */

export enum DataProvider {
  Twitter = 'twitter',
  Bsky = 'bsky',
}
declare interface APITranslate {
  text: string;
  source_lang: string;
  source_lang_en: string;
  target_lang: string;
}

declare interface APIExternalMedia {
  type: 'video';
  url: string;
  thumbnail_url?: string;
  height?: number;
  width?: number;
}

declare interface APIPollChoice {
  label: string;
  count: number;
  percentage: number;
}

declare interface APIPoll {
  choices: APIPollChoice[];
  total_votes: number;
  ends_at: string;
  time_left_en: string;
}

declare interface APIMedia {
  type: string;
  url: string;
  width: number;
  height: number;
}

declare interface APIPhoto extends APIMedia {
  type: 'photo' | 'gif';
  transcode_url?: string;
  altText?: string;
}

declare interface APIVideo extends APIMedia {
  type: 'video' | 'gif';
  thumbnail_url: string;
  format: string;
  duration: number;
}

declare interface APIMosaicPhoto extends APIMedia {
  type: 'mosaic_photo';
  formats: {
    webp: string;
    jpeg: string;
  };
}

declare interface APIFacet {
  type: string;
  indices: [start: number, end: number];
  original?: string;
  replacement?: string;
  display?: string;
  id?: string;
}
export interface APIStatus {
  id: string;
  url: string;
  text: string;
  created_at: string;
  created_timestamp: number;

  likes: number;
  reposts: number;
  replies: number;

  quote?: APIStatus;
  poll?: APIPoll;
  author: APIUser;

  media: {
    external?: APIExternalMedia;
    photos?: APIPhoto[];
    videos?: APIVideo[];
    all?: APIMedia[];
    mosaic?: APIMosaicPhoto;
  };

  raw_text: {
    text: string;
    facets: APIFacet[];
  };

  lang: string | null;
  possibly_sensitive: boolean;

  replying_to: {
    screen_name: string;
    post: string;
  } | null;

  source: string | null;

  embed_card: 'tweet' | 'summary' | 'summary_large_image' | 'player';
  provider: DataProvider;
}

export interface APITwitterStatus extends APIStatus {
  views?: number | null;
  bookmarks?: number | null;
  translation?: APITranslate;

  is_note_tweet: boolean;
  provider: DataProvider.Twitter;
}

export interface APIBlueskyStatus extends APIStatus {
  provider: DataProvider.Bsky;
}

declare interface APIUser {
  id: string;
  name: string;
  screen_name: string;
  avatar_url: string;
  banner_url: string;
  description: string;
  location: string;
  url: string;
  followers: number;
  following: number;
  likes: number;
  joined: string;
  website: {
    url: string;
    display_url: string;
  } | null;
}

export type FxTwitterResp = {
  code: number;
  message: string;
  tweet: APITwitterStatus;
};

export type FxBskyResp = {
  code: number;
  message: string;
  tweet: APIBlueskyStatus;
};
