import { Platform } from '@/constants/enum';

export type ArtworkSource = {
  type: Platform;
  post_url: string;
  picture_index: number;
};

export type ArtworkTag = {
  _id: string;
  name: string;
};

export type ImageSize = {
  width: number;
  height: number;
};

export type Artwork = {
  quality: boolean;
  title?: string;
  desc?: string;
  file_name: string;
  img_thumb: string;
  size: ImageSize;
  tags: Array<ArtworkTag>;
  source: ArtworkSource;
  create_time?: Date;
};

export type ArtworkInfo = {
  source_type: Platform;
  post_url: string;
  title?: string;
  desc?: string;
  url_thumb: string;
  url_origin: string;
  size: ImageSize;
  raw_tags?: string[];
  artist: Artist;
};

export type Artist = {
  id?: number;
  type: Platform;
  uid?: string;
  name: string;
  username?: string;
  create_time?: string; // TODO: resolve DateTime problem
};