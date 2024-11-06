import { ADMIN_CHAT_IDS, BOT_CHANNEL_COMMENT_GROUP_ID, BOT_TOKEN } from '@/constants';
import { globalAwaitReplyObj } from '@/constants/globalData';
import { prisma } from '@/utils/db';
import logger from '@/utils/logger';
import { Bot, GrammyError, HttpError } from 'grammy';
import { MessageOriginChannel } from 'grammy/types';
import deleteCommand from './commands/delete';
import echoCommand from './commands/echo';
import lsCommand, { lsManageMenu } from './commands/ls';
import postCommand from './commands/post';
import stashCommand from './commands/stash';
import submitCommand, { submitMenu } from './commands/submit';
import authGuard from './guards/authGuard';
import { WrapperContext } from './wrappers/command-wrapper';
import { extractUrls } from '@/utils/url';

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
  // { command: 'tag', description: '(admin) 给图片补 tag，回复图片消息或者带着 url，形式为  /tag [?url] #tag1 #tag2' },
  // { command: 'random', description: '随机图片' },
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

// 设置命令
bot.api.setMyCommands(commands);

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

  // Extract hashtags from text
  const hashtags = text.match(/#[^\s#投稿]+/g) || [];
  const tags = hashtags.filter((tag) => tag !== '#投稿').join(' ');

  // Construct submit command with url and tags
  const submitUpdate = {
    ...ctx.update,
    message: {
      ...ctx.message,
      text: `/submit ${url} ${tags}`,
    },
  };

  return bot.handleUpdate(submitUpdate);
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
