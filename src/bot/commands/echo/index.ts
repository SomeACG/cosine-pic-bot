import { Telegraf } from 'telegraf';

const echoCommand = Telegraf.command('echo', async (ctx) => {
  const text = ctx.message.text;
  ctx.reply('echo! ' + text);
});
export default echoCommand;
