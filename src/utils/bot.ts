import getPixivArtworkInfo, { PixivArtInfo } from '@/api/pixiv';
import { TEMP_DIR, THUMB_DIR } from '@/constants';
import { CommandType, OperateState, Platform } from '@/constants/enum';
import axios from 'axios';
import { format } from 'date-fns';
import fs from 'fs';
import path from 'path';
import { prisma } from './db';
import { compressImage, getFileSize } from './image';
import logger from './logger';

// 压缩图片 保证图片清晰度
export async function compressThumb(originFileName: string) {
  const originFilePath = path.join(TEMP_DIR, originFileName);
  const compressFilePath = path.join(THUMB_DIR, originFileName);

  const originImg = await fs.readFileSync(originFilePath);
  const compressedImg = await compressImage(originImg);

  await getFileSize(originImg);
  await getFileSize(compressedImg);

  // 确保目录存在
  if (!fs.existsSync(THUMB_DIR)) {
    logger.info('thumb 文件夹不存在，创建一下' + THUMB_DIR);
    fs.mkdirSync(THUMB_DIR);
  }
  fs.writeFileSync(compressFilePath, compressedImg);

  logger.info('compress File ' + originFileName + ' downloaded');
}

export async function downloadFile(url: string, fileName?: string): Promise<string> {
  fileName = fileName ? fileName : path.basename(new URL(url)?.pathname);
  logger.info('Start download file ' + fileName);

  const filePath = path.join(TEMP_DIR, fileName);

  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: {
      referer: url.search('pximg.net') == -1 ? '' : 'https://www.pixiv.net/',
    },
  });

  // 确保目录存在
  if (!fs.existsSync(TEMP_DIR)) {
    logger.info('temp 文件夹不存在，创建一下' + TEMP_DIR);
    fs.mkdirSync(TEMP_DIR);
  }

  fs.writeFileSync(filePath, response.data);

  await compressThumb(fileName);

  logger.info('echo File ' + fileName + ' downloaded');

  return fileName;
}

export async function downloadFileArray(urls: string[]): Promise<string[]> {
  const promises = urls.map((url) => downloadFile(url));
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
  result?: PixivArtInfo[];
};
export async function getArtworks(url: string, cmdType?: CommandType): Promise<GetArtWorkResult> {
  const artInfo = getArtInfoFromUrl(url);
  if (!artInfo?.pid) return { state: OperateState.Fail, msg: 'URL 出错了？未找到合适的图片' };

  const { pid, type } = artInfo;
  // 要发的，查重
  if (cmdType === CommandType.Post) {
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
    const artworkInfo = await getPixivArtworkInfo(url);
    return { state: OperateState.Success, result: artworkInfo };
  }

  if (type === Platform.Twitter) {
    // TODO: getTwitter Image
    console.log('getTwitter Image' + url);
    const artworkInfo = await getPixivArtworkInfo(url);
    return { state: OperateState.Success, result: artworkInfo };
  }

  return { state: OperateState.Fail, msg: 'URL 出错了？未找到合适的图片' };
}
