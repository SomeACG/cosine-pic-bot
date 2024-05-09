import { TEMP_DIR, THUMB_DIR } from '@/constants';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
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
