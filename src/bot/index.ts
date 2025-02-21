import { ADMIN_CHAT_IDS, BOT_CHANNEL_COMMENT_GROUP_ID, BOT_TOKEN } from '@/constants';
import { BotMenuName } from '@/constants/enum';
import { globalAwaitReplyObj } from '@/constants/globalData';
import { randomImageInfoCaption } from '@/utils/caption';
import { prisma } from '@/utils/db';
import logger from '@/utils/logger';
import { extractUrls } from '@/utils/url';
import { Bot, GrammyError, HttpError } from 'grammy';
import { InlineKeyboardButton, MessageOriginChannel } from 'grammy/types';
import deleteCommand from './commands/delete';
import echoCommand from './commands/echo';
import lsCommand, { lsManageMenu } from './commands/ls';
import postCommand from './commands/post';
import randomCommand, { getValidRandomImage } from './commands/random';
import restartCommand from './commands/restart';
import stashCommand from './commands/stash';
import submitCommand, { handleSubmit, submitMenu } from './commands/submit';
import updateCommand from './commands/update';
import authGuard from './guards/authGuard';
import { WrapperContext } from './wrappers/command-wrapper';

const bot = new Bot(BOT_TOKEN, {
  ContextConstructor: WrapperContext,
});

const commands = [
  { command: 'start', description: '显示欢迎信息～' },
  { command: 'help', description: '显示帮助～' },
  { command: 'echo', description: '显示 Post 预览，形式为 /echo url [?batch_?page_?batchSize] [?#tag1]  [?#tag2]' },
  { command: 'submit', description: '投稿，形式为 /recommend url #tag1 #tag2' },
  { command: 'post', description: '(admin) 发图到频道，形式为 /post url #tag1 #tag2' },
  { command: 'del', description: '(admin) 删除图片信息（标记为未发过） /del url' },
  {
    command: 'stash',
    description:
      '(admin) 暂存链接，可以通过/ls查看之前暂存未发送的链接，形式为 /stash url [?batch_?page_?batchSize] [?#tag1] [?#tag2]',
  },
  { command: 'ls', description: '(admin) 查看之前暂存未发送的链接' },
  { command: 'restart', description: '(admin) 重启同步服务' },
  {
    command: 'update',
    description: '(admin) 更新代码并重启服务，默认为都更新 传 /update api 只更新 api(SomeACG-Next) 传 /update bot 只更新 bot',
  },
  { command: 'random', description: '随机返回一张图片' },
  // { command: 'tag', description: '(admin) 给图片补 tag，回复图片消息或者带着 url，形式为  /tag [?url] #tag1 #tag2' },
  // { command: 'mark_dup', description: '(admin) 标记该图片已被发送过，形式为 /mark_dup url ' },
  // { command: 'unmark_dup', description: '(admin) 在频道评论区回复，形式为 /unmark_dup url ' },
];

bot.command('start', (ctx) => ctx.reply('欢迎，请尽情的享受咱吧～\n输入 /help 查看帮助哦'));
bot.command('help', (ctx) => {
  const contents = commands.reduce((acc, command) => {
    return acc + `/${command.command} - ${command.description}\n`;
  }, '');
  return ctx.reply('命令列表：\n' + contents);
});
bot.use(submitMenu);
bot.use(lsManageMenu);
bot.command('submit', submitCommand);
bot.command('echo', echoCommand);
bot.command('post', authGuard, postCommand);
bot.command('del', authGuard, deleteCommand);
bot.command('stash', authGuard, stashCommand);
bot.command('ls', authGuard, lsCommand);
bot.command('restart', authGuard, restartCommand);
bot.command('update', authGuard, updateCommand);
bot.command('random', randomCommand);

// 设置命令
bot.api.setMyCommands(commands);

// 处理 RANDOM_PIC 回调
bot.callbackQuery(BotMenuName.RANDOM_PIC, async (ctx) => {
  try {
    const startTime = Date.now();
    const userId = ctx.from?.username ?? ctx.from?.id;
    logger.info(`用户 ${userId} 通过按钮请求随机图片`);

    // 先应答回调查询，避免按钮显示加载状态过久
    await ctx.answerCallbackQuery();

    // 获取随机图片
    const totalImages = await prisma.image.count({
      where: {
        r18: false,
        thumburl: { not: null },
      },
    });

    if (totalImages === 0) {
      logger.warn('数据库中没有可用的非 R18 图片');
      return ctx.reply('抱歉，数据库中暂时没有可用的图片');
    }

    logger.info(`数据库中共有 ${totalImages} 张可用的非 R18 图片`);

    const validRandomImage = await getValidRandomImage(totalImages);

    if (!validRandomImage) {
      logger.error(`在多次尝试后未能获取到有效图片，用户：${userId}`);
      return ctx.reply('抱歉，获取图片失败，请稍后再试');
    }

    const { image: randomImage, originUrl } = validRandomImage;
    const { id, pid, thumburl, rawurl, platform } = randomImage;

    logger.info(`随机选中图片 ID: ${id}, PID: ${pid}, 平台: ${platform}`);

    // 构建消息文本
    const messageText = await randomImageInfoCaption(randomImage);
    const imageUrl = thumburl ?? rawurl ?? '';

    if (!imageUrl) {
      logger.error(`图片 ${pid} 没有有效的URL，platform: ${platform}`);
      return ctx.reply('抱歉，该图片的链接无效，请再试一次');
    }

    // 构建按钮
    const buttons: InlineKeyboardButton[] = [
      { text: '🔄 再来一张', callback_data: BotMenuName.RANDOM_PIC },
      { text: '🔗 原图链接', url: originUrl },
    ];

    // 发送新的图片消息
    const result = await ctx.replyWithPhoto(imageUrl, {
      caption: messageText,
      reply_markup: {
        inline_keyboard: [buttons],
      },
      parse_mode: 'HTML',
    });

    const endTime = Date.now();
    logger.info(`成功发送随机图片 ${pid} 给用户 ${userId}，耗时 ${endTime - startTime}ms`);
    return result;
  } catch (error: any) {
    const errorMessage = error?.message ?? String(error);
    logger.error('Random callback query error:', {
      error: errorMessage,
      stack: error?.stack,
      user: ctx.from?.username ?? ctx.from?.id,
    });
    return ctx.reply('获取随机图片时遇到了问题，请稍后再试');
  }
});

// 监听转发到群组的频道消息，评论区回复原图
bot.on('message:forward_origin:channel', async (ctx) => {
  if (!ctx?.message?.is_automatic_forward) return;
  const fromID = (ctx?.update?.message?.forward_origin as MessageOriginChannel)?.message_id;
  const needReplyID = ctx?.update?.message?.message_id;
  const target = globalAwaitReplyObj?.[fromID];
  if (!target) return;
  await ctx.api.sendMediaGroup(BOT_CHANNEL_COMMENT_GROUP_ID, target.medias, {
    reply_to_message_id: needReplyID,
  });
  globalAwaitReplyObj[fromID] = null;
});

// 监听包含 #投稿 的消息
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text;
  if (!text.includes('#投稿')) return;

  const urls = extractUrls(text);
  if (!urls?.length) return ctx.reply('未找到有效的链接');

  const url = urls[0];
  if (!url) return ctx.reply('未找到有效的链接');

  return handleSubmit(ctx, url);
});

bot.catch((err) => {
  const ctx = err.ctx;
  let errorMsg = '处理消息 ' + ctx.update.update_id + ' 时出错:\n```\n';

  const e = err.error;
  if (e instanceof GrammyError) {
    errorMsg += 'Error in request:' + e.description;
  } else if (e instanceof HttpError) {
    errorMsg += 'Could not contact Telegram:' + e;
  } else {
    errorMsg += 'Unknown error:' + ((e as Error)?.message ?? String(e));
  }
  errorMsg += '\n```';
  console.error(errorMsg);
  err.ctx.resolveWait(errorMsg, 'Markdown');
});

// Enable graceful stop
process.once('SIGINT', async () => {
  logger.info('[SIGINT] 呜呜呜人家要被杀掉惹...');
  ADMIN_CHAT_IDS?.length &&
    ADMIN_CHAT_IDS.forEach((adminId) => {
      bot.api.sendMessage(adminId, '[SIGINT] 呜呜呜人家要被杀掉惹...');
    });
  bot.stop();
  await prisma.$disconnect();
  process.exit(0); // 正常退出进程
});
process.once('SIGTERM', async () => {
  logger.info('[SIGTERM] 呜呜呜人家要被杀掉惹...');
  ADMIN_CHAT_IDS?.length &&
    ADMIN_CHAT_IDS.forEach((adminId) => {
      bot.api.sendMessage(adminId, '[SIGTERM] 呜呜呜人家要被杀掉惹...');
    });
  bot.stop();
  await prisma.$disconnect();
  process.exit(0); // 正常退出进程
});
export default bot;
