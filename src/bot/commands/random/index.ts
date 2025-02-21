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

const randomCommand: CommandMiddleware<WrapperContext> = async (ctx) => {
  try {
    logger.info(`用户 ${ctx.from?.username ?? ctx.from?.id} 请求随机图片`);

    // 获取随机图片
    const totalImages = await prisma.image.count({
      where: {
        r18: false, // 只返回非 R18 图片
        thumburl: { not: null }, // 确保有缩略图
      },
    });

    logger.info(`数据库中共有 ${totalImages} 张可用的非 R18 图片`);

    const validRandomImage = await getValidRandomImage(totalImages);

    if (!validRandomImage) {
      return ctx.reply('抱歉，没有找到任何可用的图片，请稍后再试');
    }

    const { image: randomImage, originUrl } = validRandomImage;
    const { id, pid, thumburl, rawurl } = randomImage;

    logger.info(`随机选中图片 ID: ${id}, PID: ${pid}`);

    // 构建消息文本
    const messageText = await randomImageInfoCaption(randomImage);
    logger.info(`messageText: ${messageText}`);
    const imageUrl = thumburl ?? rawurl ?? '';

    if (!imageUrl) return ctx.reply('出错了，没有找到任何图片');

    // 构建按钮
    const buttons: InlineKeyboardButton[] = [
      { text: '🔄 再来一张', callback_data: BotMenuName.RANDOM_PIC },
      { text: '🔗 原图链接', url: originUrl },
    ];

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

export default randomCommand;
