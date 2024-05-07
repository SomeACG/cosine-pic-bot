export type PixivAjaxResp<T> = {
  error: boolean;
  message: string;
  body: T;
};

export type PixivIllust = {
  illustId: string; // pid
  illustTitle: string; // title
  illustComment: string; // 这个跟 description 一样我也不知道为什么可能世界是一个巨大的屎山
  description: string;
  id: string;
  title: string;
  illustType: number; // 这个咱也不知道干啥的
  aiType: number; // 0 1 2，0是老作品，1是新作品，2是 AI 生成，没想到吧哈哈哈哈哈
  xRestrict: number; // 这个应该是 r18 tag， 1为r18
  urls: {
    mini: string;
    thumb: string;
    small: string;
    regular: string;
    original: string;
  };
  tags: {
    authorId: string;
    tags: [
      {
        tag: string;
        locked: boolean;
        translation?: {
          en: string;
        };
      },
    ];
  };
  alt: string;
  userId: string;
  userName: string;
  userAccount: string;
  pageCount: number;
  width: number;
  height: number;
};

export type PixivIllustPages = [
  {
    urls: {
      mini: string;
      thumb: string;
      small: string;
      regular: string;
      original: string;
    };
    width: number;
    height: number;
  },
];
