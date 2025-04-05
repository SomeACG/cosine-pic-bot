import fs from 'fs';
import logger from './logger';
import path from 'path';

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

/**
 * 清理目录中的所有文件
 * @param directory 要清理的目录路径
 */
export function clearDirectory(directory: string): void {
  if (fs.existsSync(directory)) {
    const files = fs.readdirSync(directory);
    for (const file of files) {
      const filePath = path.join(directory, file);
      if (fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
        logger.info(`已删除文件: ${filePath}`);
      }
    }
  }
}
