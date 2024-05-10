export type FxTwitterResp = {
  code: number;
  message: string;
  tweet: FxTwitterTweet;
};

export type FxTwitterTweet = {
  legacy: any;
  url: string;
  id: string;
  text: string;
  author: FxTwitterUser;
  media?: {
    photos?: FxTwitterMediaPhotos[];
  };
};

export type FxTwitterUser = {
  name: string;
  screen_name: string;
  id: string;
};

export type FxTwitterMediaPhotos = {
  url: string;
  width: number;
  height: number;
  type: string;
};
