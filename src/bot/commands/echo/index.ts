import getPixivArtworkInfo from '@/api/pixiv';
import { wrapCommand } from '@/bot/wrappers/command-wrapper';
import { TEMP_DIR } from '@/constants';
import downloadFile from '@/utils/bot';
import { infoCmdCaption } from '@/utils/caption';
import path from 'path';

const echoCommand = wrapCommand('echo', async (ctx) => {
  const args = ctx.command.args;
  if (!args?.length) return ctx.reply('请携带要预览的 url');
  const url = args[0] ?? ''; // TODO: Url validation
  // const text = ctx.command.args[0];
  //  const images = await prisma.image.findMany();
  // console.log('======= images =======\n', images[0]);
  // console.log('======= day =======\n', dayjs(images[0]?.create_time).format('YYYY-MM-DD HH:mm:ss'));
  // const res = await getPixivArtworkInfo('https://www.pixiv.net/artworks/118435340');
  // console.log('======= res =======\n', res);

  const artworkInfo = await getPixivArtworkInfo(url);
  if (!artworkInfo?.length || !artworkInfo[0]) return ctx.reply('出错了？未找到合适的图片');
  const firstImg = artworkInfo[0];
  await ctx.wait('正在获取图片信息并下载图片，请稍后~~');
  const fileName = await downloadFile(firstImg.url_origin, path.basename(new URL(firstImg.url_origin).pathname));
  const caption = infoCmdCaption(firstImg);
  await ctx.replyWithDocument(
    {
      source: path.resolve(TEMP_DIR, fileName),
    },
    {
      caption,
      parse_mode: 'HTML',
      reply_to_message_id: ctx.message.message_id,
    },
  );
  return await ctx.deleteWaiting();
});

export default echoCommand;
