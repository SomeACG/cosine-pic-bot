import { genArtistUrl, genArtworkUrl } from '@/bot/commands/utils/image';
import { CHANNEL_INFO_NAME, CHANNEL_INFO_URL, SHOW_CHANNEL_INFO } from '@/constants';
import { Platform } from '@/constants/enum';
import { ArtworkInfo } from '@/types/Artwork';
import { Image } from '@prisma/client';
import { uniq } from 'es-toolkit';
import { prisma } from './db';
import logger from './logger';

function encodeHtmlChars(text: string) {
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function infoCmdCaption(artwork_info: ArtworkInfo, saveRes?: { id: number }[]) {
  const { title, desc, artist, raw_tags, post_url, custom_tags } = artwork_info;

  let caption = '';
  if (title) caption += `<b>${encodeHtmlChars(title)}</b>\n`;
  if (desc) caption += `<blockquote>${encodeHtmlChars(desc)}</blockquote>\n`;
  if (artist) {
    const id = saveRes?.[0]?.id;
    let imageInfo: Image | null = null;
    try {
      const image = await prisma.image.findFirst({
        where: {
          id,
        },
      });
      imageInfo = image;
    } catch (error) {
      logger.warn('Error in find image info:' + error);
    }
    const { platform, authorid, author } = imageInfo ?? {};
    caption += `<a href="${post_url}">Source</a> by ${platform} <a href="${genArtistUrl(platform, {
      uid: authorid?.toString() ?? '',
      username: author ?? '',
    })}">${author}</a>\n`;
  }
  if (raw_tags?.length) {
    const tags = uniq(raw_tags.map((t) => t.replace(/#/g, '')));
    caption += '<b>原始标签:</b> ';
    caption += tags.map((str) => `#${str}`).join(' ');
    caption += '\n';
  }
  if (custom_tags?.length) {
    const tags = uniq(custom_tags.map((t) => t.replace(/#/g, '')));
    caption += '<b>自定义标签:</b> ';
    caption += tags.map((str) => `#${str}`).join(' ');
    caption += '\n';
  }
  caption += `<b>尺寸:</b> ${artwork_info.size.width}x${artwork_info.size.height}`;
  if (SHOW_CHANNEL_INFO) {
    const refs =
      CHANNEL_INFO_URL && saveRes?.length
        ? saveRes.map((item) => `<a href="${`${CHANNEL_INFO_URL}/artwork/${item?.id ?? ''}`}">${item?.id}</a>`)
        : [];
    const refsStr = refs?.length ? refs.join(', ') : '';
    caption += `\n${CHANNEL_INFO_NAME ? `${CHANNEL_INFO_NAME} | ` : ''}<a href="${CHANNEL_INFO_URL}">网站</a>${
      refsStr ? ` | ${refsStr}` : ''
    }`;
  }
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
  const finalTags = tags?.length ? uniq(tags).map((t) => '#' + t.tag?.replace(/#/g, '')) : [];
  // 构建消息文本
  try {
    const messageText =
      (platform === Platform.Pixiv ? `${title ?? '无题'}\n` : `<blockquote>${title ?? '无题'}</blockquote>`) +
      `<a href="${originUrl}">Source</a> by ${platform} <a href="${authorUrl}">${author}</a>\n` +
      (finalTags?.length ? `原始标签：${finalTags.join(' ')}\n` : '') +
      `<b>尺寸:</b>${width}x${height}\n` +
      SHOW_CHANNEL_INFO
        ? `${CHANNEL_INFO_NAME ? `${CHANNEL_INFO_NAME} | ` : ''}<a href="${CHANNEL_INFO_URL}/artwork/${id}">本图链接</a>`
        : '';
    logger.info('info:' + JSON.stringify({ tags, finalTags, author, platform, pid, width, height, authorUrl, title }));
    logger.info('messageText:' + messageText);
    return messageText;
  } catch (error) {
    logger.error('Error in randomImageInfoCaption:' + error);
    return '';
  }
}
