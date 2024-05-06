import { prisma } from '@/utils/db';
import dayjs from 'dayjs';
import { Telegraf } from 'telegraf';

const echoCommand = Telegraf.command('echo', async (ctx) => {
  const text = ctx.message.text;
  ctx.reply('echo! ' + text);
  const images = await prisma.image.findMany();
  console.log('======= images =======\n', images[0]);
  console.log('======= day =======\n', dayjs(images[0]?.create_time).format('YYYY-MM-DD HH:mm:ss'));
});
export default echoCommand;
