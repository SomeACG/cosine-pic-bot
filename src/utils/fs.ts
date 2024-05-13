import fs from 'fs';
import logger from './logger';

export const fsExistOrCreate = (dirPath?: string) => {
  if (!dirPath) return false;
  try {
    // 确保目录存在
    if (!fs.existsSync(dirPath)) {
      logger.info('存储目录不存在，创建一下：' + dirPath);
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return true;
  } catch (e) {
    logger.error(e);
    return false;
  }
};
