import { TEMP_DIR } from '@/constants';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import logger from './logger';

export default async function downloadFile(url: string, file_name?: string): Promise<string> {
  file_name = file_name ? file_name : path.basename(url);
  logger.info('Start download file ' + file_name);

  const file_path = path.join(TEMP_DIR, file_name);

  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: {
      referer: url.search('pximg.net') == -1 ? '' : 'https://www.pixiv.net/',
    },
  });

  // 确保目录存在
  if (!fs.existsSync(TEMP_DIR)) {
    logger.info('Temp文件夹不存在 创建一下' + TEMP_DIR);
    fs.mkdirSync(TEMP_DIR);
  }

  fs.writeFileSync(file_path, response.data);

  logger.info('echo File ' + file_name + ' downloaded');

  return file_name;
}
