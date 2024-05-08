import { WrapperContext } from '@/bot/wrappers/command-wrapper';
import { CommandMiddleware } from 'grammy';

// admin
const postCommand: CommandMiddleware<WrapperContext> = async (ctx) => {
  ctx.reply('post!');
};
export default postCommand;
