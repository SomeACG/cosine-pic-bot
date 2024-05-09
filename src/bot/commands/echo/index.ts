import getPixivArtworkInfo from '@/api/pixiv';
import { WrapperContext } from '@/bot/wrappers/command-wrapper';
import { TEMP_DIR, THUMB_DIR } from '@/constants';
import { downloadFileArray } from '@/utils/bot';
import { infoCmdCaption } from '@/utils/caption';
import { CommandMiddleware, InputFile, InputMediaBuilder } from 'grammy';
import path from 'path';

const echoCommand: CommandMiddleware<WrapperContext> = async (ctx) => {
  console.log('======= ctx =======\n', ctx);
  const args = ctx.command.args;
  if (!args?.length) return ctx.reply('请携带要预览的 url');
  const url = args[0] ?? ''; // TODO: Url validation
  // const text = ctx.command.args[0];
  // const images = await prisma.image.findMany();
  // console.log('======= images =======\n', images[0]);
  // console.log('======= day =======\n', dayjs(images[0]?.create_time).format('YYYY-MM-DD HH:mm:ss'));
  // const res = await getPixivArtworkInfo('https://www.pixiv.net/artworks/118435340');
  // console.log('======= res =======\n', res);

  const artworkInfo = await getPixivArtworkInfo(url);
  if (!artworkInfo?.length || !artworkInfo[0]) return ctx.reply('出错了？未找到合适的图片');
  const firstImg = artworkInfo[0];
  const caption = infoCmdCaption(firstImg);

  await ctx.wait('正在获取图片信息并下载图片，请稍后~~');

  const originUrls = artworkInfo.map((item) => item.url_origin);
  const originFileNames = await downloadFileArray(originUrls);

  const originFiles = originFileNames.map((item) => new InputFile(path.resolve(TEMP_DIR, item)));
  const thumbFiles = originFileNames.map((item) => new InputFile(path.resolve(THUMB_DIR, item)));

  const thumbMedias = thumbFiles.map((file, idx) =>
    InputMediaBuilder.photo(file, idx === 0 ? { caption, parse_mode: 'HTML' } : {}),
  );
  const originMedias = originFiles.map((file) => InputMediaBuilder.document(file));

  await ctx.replyWithMediaGroup(thumbMedias, {
    reply_to_message_id: ctx.message?.message_id,
  });
  await ctx.replyWithMediaGroup(originMedias, {
    reply_to_message_id: ctx.message?.message_id,
  });

  return await ctx.deleteWaiting();
};

export default echoCommand;
