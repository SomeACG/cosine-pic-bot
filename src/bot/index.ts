import { ADMIN_CHAT_IDS, BOT_TOKEN } from '@/constants';
import { prisma } from '@/utils/db';
import logger from '@/utils/logger';
import { Bot, GrammyError, HttpError } from 'grammy';
import echoCommand from './commands/echo';
import postCommand from './commands/post';
import authGuard from './guards/authGuard';
import { WrapperContext } from './wrappers/command-wrapper';

const bot = new Bot(BOT_TOKEN, {
  ContextConstructor: WrapperContext,
});

const commands = [
  { command: 'start', description: '显示欢迎信息～' },
  { command: 'help', description: '显示帮助～' },
  { command: 'echo', description: '显示 Post 预览，形式为 /echo url [?batch_?page]  [?#tag1]  [?#tag2]' },
  { command: 'post', description: '(admin) 发图到频道，形式为 /post url #tag1 #tag2 （暂未开放）' },
  // { command: 'recommend', description: '投稿，形式为 /recommend url #tag1 #tag2' },
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

bot.command('echo', echoCommand);
bot.command('post', authGuard, postCommand);
// 设置命令
bot.api.setMyCommands(commands);

bot.catch((err) => {
  const ctx = err.ctx;
  let errorMsg = '处理消息 ' + ctx.update.update_id + ' 时出错:\n```\n';

  const e = err.error;
  if (e instanceof GrammyError) {
    errorMsg += 'Error in request:' + e.description;
  } else if (e instanceof HttpError) {
    errorMsg += 'Could not contact Telegram:' + e;
  } else {
    errorMsg += 'Unknown error:' + e;
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
