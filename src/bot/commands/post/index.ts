import { Telegraf } from 'telegraf';

const postCommand = Telegraf.command('post', async (ctx) => {
  ctx.reply('post!');
});
export default postCommand;
