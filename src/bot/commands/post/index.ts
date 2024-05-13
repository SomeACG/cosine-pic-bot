import { WrapperContext } from '@/bot/wrappers/command-wrapper';
import { TEMP_DIR, THUMB_DIR } from '@/constants';
import { CommandType, OperateState } from '@/constants/enum';
import { downloadFileArray, getArtworks } from '@/utils/bot';
import { infoCmdCaption } from '@/utils/caption';
import { CommandMiddleware, InputFile, InputMediaBuilder } from 'grammy';
import path from 'path';

const postCommand: CommandMiddleware<WrapperContext> = async (ctx) => {
  const args = ctx.command.args;
  if (!args?.length) return ctx.reply('请携带要发送的 url');

  const url = args[0] ?? ''; // TODO: Url validation
  const { state, msg, result: artworksInfo } = await getArtworks(url, CommandType.Post);

  if (state === OperateState.Fail) return ctx.reply(msg ?? 'unknown error', { parse_mode: 'HTML' });

  if (!artworksInfo?.length || !artworksInfo[0]) return ctx.reply('出错了？未找到合适的图片');

  const firstImg = artworksInfo[0];
  const caption = infoCmdCaption(firstImg);

  await ctx.wait('正在获取图片信息并下载图片，请稍后~~');

  const originFileNames = await downloadFileArray(artworksInfo);

  const originFiles = originFileNames.map((item) => new InputFile(path.resolve(TEMP_DIR, item)));
  const thumbFiles = originFileNames.map((item) => new InputFile(path.resolve(THUMB_DIR, item)));

  const thumbMedias = thumbFiles.map((file, idx) =>
    InputMediaBuilder.photo(file, idx === 0 ? { caption, parse_mode: 'HTML' } : {}),
  );
  const originMedias = originFiles.map((file) => InputMediaBuilder.document(file));

  // TODO: Change to Post in Channel
  await ctx.replyWithMediaGroup(thumbMedias, {
    reply_to_message_id: ctx.message?.message_id,
  });
  await ctx.replyWithMediaGroup(originMedias, {
    reply_to_message_id: ctx.message?.message_id,
  });

  return await ctx.deleteWaiting();
};

export default postCommand;
