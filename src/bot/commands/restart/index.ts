import { WrapperContext } from '@/bot/wrappers/command-wrapper';
import { CommandMiddleware } from 'grammy';
import { ADMIN_CHAT_IDS } from '@/constants';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

const exec = promisify(execCallback);

const restartCommand: CommandMiddleware<WrapperContext> = async (ctx) => {
  const userId = ctx.from?.id;

  // 检查是否是管理员
  if (!userId || !ADMIN_CHAT_IDS.includes(userId)) {
    return ctx.reply('抱歉，只有管理员可以执行此命令');
  }

  try {
    await ctx.wait('正在重启服务...');
    await exec('pm2 restart cos-pic-db-sync');
    await ctx.deleteWaiting();
    return await ctx.reply('重启命令已成功执行');
  } catch (error: any) {
    return ctx.reply(`执行出错: ${error.message}`);
  }
};

export default restartCommand;
