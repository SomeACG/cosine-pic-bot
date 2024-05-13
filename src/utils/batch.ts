import { ArtworkInfo } from '@/types/Artwork';

// 分批发，比如 14 张，就分成 2 个 7张 ，但是每一批次不可超过 size
export function chunkMedias(
  arr: ArtworkInfo[],
  limit = 4,
): {
  totalPage: number;
  res: ArtworkInfo[][];
} {
  if (!arr?.length) return { totalPage: 0, res: [[]] };

  const totalPage = Math.ceil(arr.length / limit);
  const res: ArtworkInfo[][] = [];

  for (let i = 0; i < arr.length; i += limit) res.push(arr.slice(i, i + limit));

  return {
    totalPage,
    res,
  };
}
