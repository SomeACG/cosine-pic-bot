import { Metadata, ResizeFilterType, ResizeFit, Transformer } from '@napi-rs/image';

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
  // logger.info(`File size: ${fileSizeBytes} bytes, ${fileSizeKilobytes.toFixed(2)} KB`);
  return fileSizeKilobytes;
}

const ORIGIN_LIMIT_SIZE = 1024 * 20;
const THUMB_LIMIT_SIZE = 1024 * 10;

// 压缩图片，origin 保证图片清晰度，限制最大 20 MB, thumb 缩略图要求
// limitFileSize 大于多少 KB 进行压缩
export async function compressImage(file: Buffer, postMode: 'origin' | 'thumb') {
  const transformer = new Transformer(file);
  const metadata = await getImageMetaData(file);
  const { format, width, height } = metadata;
  const fileSizeKB = await getFileSize(file); // 10MB
  let resultImg = transformer;
  if (postMode === 'thumb') {
    if (width < 2560 && height < 2560 && fileSizeKB < THUMB_LIMIT_SIZE) {
      // console.log('不用压');
      return file;
    }
    resultImg = await transformer.resize(2560, 2560, ResizeFilterType.Lanczos3, ResizeFit.Inside);
  } else {
    if (fileSizeKB < ORIGIN_LIMIT_SIZE) {
      // console.log('不用压');
      return file;
    }
  }

  if (format === 'png') {
    const png = await resultImg.png();
    const pngSize = await getFileSize(png);
    if (postMode === 'origin' && pngSize > ORIGIN_LIMIT_SIZE) return await resultImg.jpeg();
    if (postMode === 'thumb' && pngSize > THUMB_LIMIT_SIZE) return await resultImg.jpeg();
    return png;
  } else return await resultImg.jpeg();
}

export function getUrlFileExtension(url?: string) {
  if (!url) return undefined;
  const match = url.match(/\.([^/?#]+)(?=[?#]|$)/);
  const extension = match?.length ? match[1] : 'jpg';
  return extension;
}
