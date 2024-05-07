export type ArtworkSourceType = 'pixiv' | 'twitter';

export type ImageSize = {
  width: number;
  height: number;
};

export type CommandEntity = {
  name: string; // 命令名称 如/post
  args: string[];
};

export type Artist = {
  id?: number;
  type: ArtworkSourceType;
  uid?: string;
  name: string;
  username?: string;
  create_time?: string;
};
