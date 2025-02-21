import { genArtistUrl, genArtworkUrl } from '@/bot/commands/utils/image';
import { ArtworkInfo } from '@/types/Artwork';
import { Image } from '@prisma/client';
import { prisma } from './db';
import { Platform } from '@/constants/enum';

function encodeHtmlChars(text: string) {
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function infoCmdCaption(artwork_info: ArtworkInfo, saveRes?: { id: number }[]) {
  const { title, desc, artist, raw_tags, post_url, custom_tags } = artwork_info;
  const id = saveRes?.[0]?.id;
  const image = await prisma.image.findFirst({
    where: {
      id,
    },
  });
  let caption = '';
  if (title) caption += `<b>${encodeHtmlChars(title)}</b>\n`;
  if (desc) caption += `<blockquote>${encodeHtmlChars(desc)}</blockquote>\n`;
  if (artist) {
    const { platform, authorid, author } = image ?? {};
    caption += `<a href="${post_url}">Source</a> by ${platform} <a href="${genArtistUrl(platform, {
      uid: authorid?.toString() ?? '',
      username: author ?? '',
    })}">${author}</a>\n`;
  }
  if (raw_tags?.length) {
    caption += '<b>原始标签:</b> ';
    caption += raw_tags.map((str) => `#${str}`).join(' ');
    caption += '\n';
  }
  if (custom_tags?.length) {
    caption += '<b>自定义标签:</b> ';
    caption += custom_tags.join(' ');
    caption += '\n';
  }
  caption += `<b>尺寸:</b> ${artwork_info.size.width}x${artwork_info.size.height}`;
  const refs = saveRes?.length
    ? saveRes.map((item) => `<a href="${`https://pic.cosine.ren/artwork/${item?.id ?? ''}`}">${item?.id}</a>`)
    : [];
  const refsStr = refs?.length ? refs.join(', ') : '';
  caption += `\n@CosineGallery | <a href="https://pic.cosine.ren/">网站</a>${refsStr ? `| ${refsStr}` : ''}`;

  return caption;
}

// 随机图片信息
export async function randomImageInfoCaption(image: Image) {
  const { id, title, author, authorid, platform, pid, width, height } = image;
  const authorUrl = genArtistUrl(platform, {
    uid: authorid?.toString() ?? '',
    username: author ?? '',
  });
  const originUrl = genArtworkUrl({ platform: platform, pid: pid ?? '' });

  // 获取图片的标签
  const tags = await prisma.imageTag.findMany({
    where: {
      pid: pid,
    },
  });
  const finalTags = tags?.length ? tags.map((t) => '#' + t.tag?.replace(/#/g, '')) : [];
  // 构建消息文本
  const messageText =
    platform === Platform.Pixiv
      ? `🎨 ${title ?? '无题'}\n`
      : `<blockquote>${title ?? '无题'}</blockquote>` +
        `<a href="${originUrl}">Source</a> by ${platform} <a href="${authorUrl}">${author}</a>\n` +
        (finalTags?.length ? `原始标签：${finalTags.join(' ')}\n` : '') +
        `<b>尺寸:</b>${width}x${height}\n` +
        `@CosineGallery | <a href="https://pic.cosine.ren/artwork/${id}">本图链接</a>`;
  return messageText;
}
