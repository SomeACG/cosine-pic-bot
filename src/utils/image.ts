import { Metadata, ResizeFilterType, ResizeFit, Transformer } from '@napi-rs/image';
import logger from './logger';

export async function getImageMetaData(file: Buffer): Promise<Metadata> {
  const decoder = new Transformer(file);
  const metadata = await decoder.metadata(true);
  console.dir(metadata);
  return metadata;
}

export async function getFileSize(file: Buffer) {
  // 获取Buffer的大小（字节）
  const fileSizeBytes = file.length;
  // 转换为千字节 (KB)
  const fileSizeKilobytes = fileSizeBytes / 1024;
  logger.info(`File size: ${fileSizeBytes} bytes, ${fileSizeKilobytes.toFixed(2)} KB`);
  return fileSizeKilobytes;
}

export async function compressImage(file: Buffer) {
  const transformer = new Transformer(file);
  const metadata = await getImageMetaData(file);
  const { format } = metadata;
  const resizeImg = await transformer.resize(2560, 2560, ResizeFilterType.Lanczos3, ResizeFit.Inside);
  if (format === 'png') return await resizeImg.png();
  else return await resizeImg.jpeg();
}
