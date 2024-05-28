import getPixivArtworkInfo from '@/api/pixiv';
import getTwitterArtworkInfo from '@/api/twitter-web-api/getTwitterArtworkInfo';
import { DEV_MODE, DOWNLOAD_DIR, TEMP_DIR, THUMB_DIR } from '@/constants';
import { CommandType, OperateState, Platform } from '@/constants/enum';
import { ArtworkInfo } from '@/types/Artwork';
import { PostUserInfo } from '@/types/User';
import { Prisma } from '@prisma/client';
import axios from 'axios';
import { format } from 'date-fns';
import fs from 'fs';
import path from 'path';
import { prisma } from './db';
import { fsExistOrCreate } from './fs';
import { compressImage } from './image';
import logger from './logger';

export function getDirByCmdType(cmdType?: CommandType) {
  if (cmdType === CommandType.Post) return DOWNLOAD_DIR;
  return TEMP_DIR;
}
// 压缩图片 保证图片清晰度
export async function compressThumb(originFileName: string, platform: Platform, dir: string) {
  const originFilePath = path.join(dir, platform, originFileName);

  const thumbDirName = path.join(THUMB_DIR, platform);
  const compressFilePath = path.join(thumbDirName, originFileName);

  const originImg = await fs.readFileSync(originFilePath);
  const compressedImg = await compressImage(originImg, 'thumb');

  // await getFileSize(originImg);
  // await getFileSize(compressedImg);

  if (!fsExistOrCreate(thumbDirName)) throw Error('download thumb failed, 存储目录不存在');

  fs.writeFileSync(compressFilePath, compressedImg);

  logger.info('compress Thumb File ' + originFileName + ' downloaded');
}

// 为什么不跟上面合成一个函数呢，这个等日后考量一下再说吧，万一需要加什么操作呢w
export async function compressOrigin(originFileName: string, platform: Platform, dir: string) {
  const originDirName = path.join(dir, platform);

  const originFilePath = path.join(originDirName, originFileName);
  const originImg = await fs.readFileSync(originFilePath);

  const compressFilePath = path.join(originDirName, originFileName);
  const compressedImg = await compressImage(originImg, 'origin');

  if (!fsExistOrCreate(originDirName)) throw Error('download origin failed, 存储目录不存在');

  fs.writeFileSync(compressFilePath, compressedImg);

  logger.info('compress Origin File ' + originFileName + ' downloaded');
}

export async function downloadFile({
  url,
  fileName,
  platform,
  cmdType = CommandType.Echo,
}: {
  url: string;
  fileName?: string;
  platform: Platform;
  cmdType?: CommandType;
}): Promise<string> {
  fileName = fileName ? fileName : path.basename(new URL(url)?.pathname);
  logger.info('Start download file ' + fileName);
  const dir = getDirByCmdType(cmdType);
  const dirPath = path.join(dir, platform);
  const filePath = path.join(dirPath, fileName);

  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: {
      referer: url.search('pximg.net') == -1 ? '' : 'https://www.pixiv.net/',
    },
  });

  if (!fsExistOrCreate(dirPath)) throw Error('download file ' + fileName + ' failed, 存储目录不存在');

  fs.writeFileSync(filePath, response.data);

  await compressThumb(fileName, platform, dir);
  await compressOrigin(fileName, platform, dir);

  logger.info(cmdType + ' file ' + fileName + ' downloaded');

  return fileName;
}

export async function downloadFileArray(
  artworksInfo: ArtworkInfo[],
  cmdType: CommandType = CommandType.Echo,
): Promise<string[]> {
  const promises = artworksInfo.map(({ pid, url_origin, source_type, extension }, idx) => {
    const fileName = source_type === Platform.Twitter ? `${pid}_${idx}.${extension}` : undefined;
    return downloadFile({
      url: url_origin,
      platform: source_type,
      fileName,
      cmdType,
    });
  });
  return await Promise.all(promises);
}

export function getArtInfoFromUrl(url: string): { type: Platform; pid?: string | null } | null {
  try {
    const pathname = new URL(url).pathname;
    if (!pathname) return null;
    if (url.includes('pixiv.net/artworks/')) {
      const match = pathname.match(/(\d+)(?=\?|$)/);
      return {
        type: Platform.Pixiv,
        pid: match?.length ? match[0] : null,
      };
    }
    if (url.includes('twitter') || url.includes('x.com')) {
      const match = pathname.split('/');
      return {
        type: Platform.Twitter,
        pid: match?.length ? match[match.length - 1] : null,
      };
    }
    return null;
  } catch (e) {
    return null;
  }
}

export type GetArtWorkResult = {
  state: OperateState;
  msg?: string;
  result?: ArtworkInfo[];
};
export async function getArtworks(url: string, cmdType: CommandType = CommandType.Echo): Promise<GetArtWorkResult> {
  const artInfo = getArtInfoFromUrl(url);
  if (!artInfo?.pid) return { state: OperateState.Fail, msg: 'URL 出错了？未找到合适的图片' };
  const { pid, type } = artInfo;
  // 要发的，查重
  if (cmdType === CommandType.Post && !DEV_MODE) {
    const res = await prisma.image.findFirst({ where: { pid } });
    if (res?.create_time) {
      logger.info(`图片 ${pid} 已经存在于数据库中`);
      return {
        state: OperateState.Fail,
        msg: `该图片已经由 <a href="tg://user?id=${res.userid}">${res.username ?? '匿名用户'}</a> 于 ${format(
          res.create_time,
          'yyyy-MM-dd HH:mm:ss',
        )} 发过`,
      };
    }
  }
  if (type === Platform.Pixiv) {
    const artworks = await getPixivArtworkInfo(url);
    return { state: OperateState.Success, result: artworks };
  }

  if (type === Platform.Twitter) {
    const { state, result: artworks, msg } = await getTwitterArtworkInfo(url);
    if (state === OperateState.Fail) {
      return { state, msg };
    }
    return { state: OperateState.Success, result: artworks };
  }

  return { state: OperateState.Fail, msg: 'URL 出错了？未找到合适的图片' };
}

export async function saveArtworkInfo(artworks: ArtworkInfo[], userInfo?: PostUserInfo) {
  try {
    if (!artworks?.length) return;
    const res = await prisma.image.createMany({
      data: artworks.map((artwork, idx) => {
        const { title, desc, size, source_type, pid, extension, artist, url_thumb, url_origin, r18, ai } = artwork;
        const page = source_type === Platform.Pixiv ? idx : idx + 1;
        const imgInfo: Prisma.ImageCreateManyInput = {
          ...userInfo,
          create_time: new Date(),
          platform: source_type,
          title: title ?? desc, // TODO: 历史遗留, twitter内容之前是用 title 存 也待重构 (2024-05-28)
          page,
          width: size.width,
          height: size.height,
          filename: source_type === Platform.Twitter ? `${pid}_${page}.${extension}` : `${pid}_p${page}.${extension}`,
          author: artist.name,
          authorid: BigInt(artist.uid ?? '0'),
          pid,
          extension,
          rawurl: url_origin,
          thumburl: url_thumb,
          r18,
          ai,
        };
        return imgInfo;
      }),
    });
    const tags: Prisma.ImageTagCreateManyInput[] = artworks.reduce((prev, art) => {
      const { pid, custom_tags, raw_tags } = art;
      const tags: Prisma.ImageTagCreateManyInput[] = (raw_tags ?? []).concat(custom_tags ?? []).map((tag) => ({ tag, pid }));
      return prev.concat(tags);
    }, [] as Prisma.ImageTagCreateManyInput[]);

    const uniqueTagsSet = new Set<string>();
    const uniqueTags = tags
      .filter((tag) => {
        const key = `${tag.pid}-${tag.tag}`;
        if (!uniqueTagsSet.has(key)) {
          uniqueTagsSet.add(key);
          return true;
        }
        return false;
      })
      .map(({ tag, ...rest }) => ({ ...rest, tag: '#' + tag })); // TODO: 保留和原数据库的一致性，后续需要重构这坨历史遗留数据
    await prisma.imageTag.createMany({
      data: uniqueTags,
    });
    logger.info('post createMany success, create ' + res.count + ' records');
  } catch (e) {
    logger.error(e);
  }
}
