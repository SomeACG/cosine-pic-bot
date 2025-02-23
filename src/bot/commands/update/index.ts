import { WrapperContext } from '@/bot/wrappers/command-wrapper';
import { CommandMiddleware } from 'grammy';
import { ADMIN_CHAT_IDS } from '@/constants';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

enum UpdateType {
  All = 'all',
  Api = 'api',
  Bot = 'bot',
}

const exec = promisify(execCallback);

function isValidUpdateType(value: string | undefined): value is UpdateType {
  return value !== undefined && Object.values(UpdateType).includes(value as UpdateType);
}

const updateCommand: CommandMiddleware<WrapperContext> = async (ctx) => {
  const userId = ctx.from?.id;
  const args = ctx.command.args;
  const input = args.shift();
  const updateType = isValidUpdateType(input) ? input : UpdateType.All;

  // 检查是否是管理员
  if (!userId || !ADMIN_CHAT_IDS.includes(userId)) {
    return ctx.reply('抱歉，只有管理员可以执行此命令');
  }

  try {
    // 拉取最新代码
    if ([UpdateType.All, UpdateType.Api].includes(updateType)) {
      await ctx.resolveWait('正在拉取 SomeACG-Next 最新代码...');
      await exec('cd /root/code/SomeACG-Next && git pull -f && pm2 restart SomeACG-Next');
      await ctx.reply('SomeACG-Next 更新完成！');
    }
    if ([UpdateType.All, UpdateType.Bot].includes(updateType)) {
      await ctx.resolveWait('正在拉取 cosine-pic-bot 最新代码...');
      await exec('git pull -f && npm run pm2:restart');
    }
    return;
  } catch (error: any) {
    return ctx.reply(`更新失败: ${error.message}`);
  }
};

export default updateCommand;
