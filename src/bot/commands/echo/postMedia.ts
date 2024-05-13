import { WrapperContext } from '@/bot/wrappers/command-wrapper';
import { TEMP_DIR, THUMB_DIR } from '@/constants';
import { ArtworkInfo } from '@/types/Artwork';
import { downloadFileArray } from '@/utils/bot';
import { infoCmdCaption } from '@/utils/caption';
import { CommandContext, InputFile, InputMediaBuilder } from 'grammy';
import path from 'path';

export async function echoPostMedia(
  ctx: CommandContext<WrapperContext>,
  artworks: ArtworkInfo[],
  page?: number,
  totalPage?: number,
) {
  if (!artworks?.length || !artworks[0]) {
    ctx.reply('出错了？未找到合适的图片');
    return;
  }

  const firstImg = artworks[0];
  const total = totalPage ?? 0;
  const caption = (total >= 2 ? `第 ${(page ?? 0) + 1}/${total} 批\n` : '') + infoCmdCaption(firstImg);

  const originFileNames = await downloadFileArray(artworks);
  const platform = artworks[0].source_type;
  const originFiles = originFileNames.map((item) => new InputFile(path.resolve(TEMP_DIR, platform, item)));
  const thumbFiles = originFileNames.map((item) => new InputFile(path.resolve(THUMB_DIR, platform, item)));

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
}
