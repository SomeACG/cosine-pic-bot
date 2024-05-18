import getPixivArtworkInfo from '@/api/pixiv';
import getTwitterArtworkInfo from '@/api/twitter-web-api/getTwitterArtworkInfo';
import { TEMP_DIR, THUMB_DIR } from '@/constants';
import { CommandType, OperateState, Platform } from '@/constants/enum';
import { ArtworkInfo } from '@/types/Artwork';
import axios from 'axios';
import { format } from 'date-fns';
import fs from 'fs';
import path from 'path';
import { prisma } from './db';
import { fsExistOrCreate } from './fs';
import { compressImage } from './image';
import logger from './logger';

// 压缩图片 保证图片清晰度
export async function compressThumb(originFileName: string, platform: Platform) {
  const originFilePath = path.join(TEMP_DIR, platform, originFileName);

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

// 为什么不跟上面合成一个函数呢，这个等日后考量一下再说吧，玩意需要加什么操作呢w
export async function compressOrigin(originFileName: string, platform: Platform) {
  const originDirName = path.join(TEMP_DIR, platform);

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
}: {
  url: string;
  fileName?: string;
  platform: Platform;
}): Promise<string> {
  fileName = fileName ? fileName : path.basename(new URL(url)?.pathname);
  logger.info('Start download file ' + fileName);

  const dirPath = path.join(TEMP_DIR, platform);
  const filePath = path.join(dirPath, fileName);

  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: {
      referer: url.search('pximg.net') == -1 ? '' : 'https://www.pixiv.net/',
    },
  });

  if (!fsExistOrCreate(dirPath)) throw Error('download file ' + fileName + ' failed, 存储目录不存在');

  fs.writeFileSync(filePath, response.data);

  await compressThumb(fileName, platform);
  await compressOrigin(fileName, platform);

  logger.info('echo File ' + fileName + ' downloaded');

  return fileName;
}

export async function downloadFileArray(artworksInfo: ArtworkInfo[]): Promise<string[]> {
  const promises = artworksInfo.map(({ pid, url_origin, source_type, extension }, idx) => {
    const fileName = source_type === Platform.Twitter ? `${pid}_${idx}.${extension}` : undefined;
    return downloadFile({
      url: url_origin,
      platform: source_type,
      fileName,
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
export async function getArtworks(url: string, cmdType?: CommandType): Promise<GetArtWorkResult> {
  const artInfo = getArtInfoFromUrl(url);
  if (!artInfo?.pid) return { state: OperateState.Fail, msg: 'URL 出错了？未找到合适的图片' };

  const { pid, type } = artInfo;
  // 要发的，查重
  if (cmdType === CommandType.Post) {
    const res = await prisma.image.findFirst({ where: { pid } });
    // console.log('======= res =======\n', res);
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
    const artworkInfo = await getPixivArtworkInfo(url);
    return { state: OperateState.Success, result: artworkInfo };
  }

  if (type === Platform.Twitter) {
    const { state, result, msg } = await getTwitterArtworkInfo(url);
    if (state === OperateState.Fail) {
      return { state, msg };
    }
    return { state: OperateState.Success, result: result };
  }

  return { state: OperateState.Fail, msg: 'URL 出错了？未找到合适的图片' };
}
