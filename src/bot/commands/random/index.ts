import { WrapperContext } from '@/bot/wrappers/command-wrapper';
import { BotMenuName } from '@/constants/enum';
import { randomImageInfoCaption } from '@/utils/caption';
import { prisma } from '@/utils/db';
import logger from '@/utils/logger';
import { CommandMiddleware } from 'grammy';
import { InlineKeyboardButton } from 'grammy/types';
import { genArtworkUrl } from '../utils/image';
import { Image } from '@prisma/client';

interface ValidRandomImage {
  image: Image;
  originUrl: string;
}

export async function getValidRandomImage(totalImages: number, maxAttempts = 3): Promise<ValidRandomImage | null> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    const skip = Math.floor(Math.random() * totalImages);
    const randomImage = await prisma.image.findFirst({
      where: {
        r18: false,
        thumburl: { not: null },
      },
      skip: skip,
    });

    if (!randomImage) {
      logger.warn('未找到符合条件的图片');
      attempts++;
      continue;
    }

    const { platform, pid } = randomImage;
    const originUrl = genArtworkUrl({ platform: platform, pid: pid ?? '' });

    if (originUrl) {
      return { image: randomImage, originUrl };
    }

    logger.warn(`图片 ${pid} 的原始链接无效，尝试获取新的图片`);
    attempts++;
  }

  logger.warn(`在 ${maxAttempts} 次尝试后仍未找到有效图片`);
  return null;
}

interface RandomPicResponse {
  messageText: string;
  imageUrl: string;
  originUrl: string;
  pid: string;
  id: number;
}

async function getRandomPicResponse(): Promise<RandomPicResponse | null> {
  // 获取随机图片
  const totalImages = await prisma.image.count({
    where: {
      r18: false,
      thumburl: { not: null },
    },
  });

  if (totalImages === 0) {
    logger.warn('数据库中没有可用的非 R18 图片');
    return null;
  }

  logger.info(`数据库中共有 ${totalImages} 张可用的非 R18 图片`);

  const validRandomImage = await getValidRandomImage(totalImages);

  if (!validRandomImage) {
    logger.error('在多次尝试后未能获取到有效图片');
    return null;
  }

  const { image: randomImage, originUrl } = validRandomImage;
  const { id, pid, thumburl, rawurl } = randomImage;

  logger.info(`随机选中图片 ID: ${id}, PID: ${pid}`);

  // 构建消息文本
  const messageText = await randomImageInfoCaption(randomImage);
  const imageUrl = thumburl ?? rawurl ?? '';

  if (!imageUrl) {
    logger.error(`图片 ${pid} 没有有效的URL`);
    return null;
  }

  return {
    messageText,
    imageUrl,
    originUrl,
    pid: pid ?? '',
    id,
  };
}

// 构建通用的按钮
function buildInlineKeyboard(originUrl: string): InlineKeyboardButton[] {
  return [
    { text: '🔄 再来一张', callback_data: BotMenuName.RANDOM_PIC },
    { text: '🔀 换一换', callback_data: BotMenuName.CHANGE_PIC },
    { text: '🔗 原图链接', url: originUrl },
  ];
}

const randomCommand: CommandMiddleware<WrapperContext> = async (ctx) => {
  try {
    logger.info(`用户 ${ctx.from?.username ?? ctx.from?.id} 请求随机图片`);

    const response = await getRandomPicResponse();

    if (!response) {
      return ctx.reply('抱歉，没有找到任何可用的图片，请稍后再试');
    }

    const { messageText, imageUrl, originUrl, pid } = response;
    const buttons = buildInlineKeyboard(originUrl);

    // 发送图片
    const result = await ctx.replyWithPhoto(imageUrl, {
      caption: messageText,
      reply_markup: {
        inline_keyboard: [buttons],
      },
      parse_mode: 'HTML',
    });

    logger.info(`成功发送随机图片 ${pid} 给用户 ${ctx.from?.username ?? ctx.from?.id}`);
    return result;
  } catch (error: any) {
    logger.error('Random command error:', error);
    return ctx.reply('获取随机图片时出错了，请稍后再试');
  }
};

export { getRandomPicResponse, buildInlineKeyboard };
export default randomCommand;
