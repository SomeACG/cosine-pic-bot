import { WrapperContext } from '@/bot/wrappers/command-wrapper';
import { TEMP_DIR, THUMB_DIR } from '@/constants';
import { ArtworkInfo } from '@/types/Artwork';
import { downloadFileArray } from '@/utils/bot';
import { infoCmdCaption } from '@/utils/caption';
import { CommandContext, InputFile, InputMediaBuilder } from 'grammy';
import path from 'path';

function getOptCaption({
  currentPage,
  total,
  option,
}: {
  currentPage?: number;
  total?: number;
  option: { page: number; batch: number; batchSize: number };
}) {
  const { batch, page, batchSize } = option;
  if (total && total >= 2 && !page && !batch) return `\n第 ${(currentPage ?? 0) + 1}/${total} 批\n`;
  if (!page && !batch) return '';
  const batchStr = batch ? `获取第 ${batch} 批` : '获取每批';
  const pageStr = page ? `第 ${page} 张` : '所有张';
  const batchSizeStr = `每批最多 ${batchSize} 张\n`;
  return `\n共 ${total} 批，` + batchSizeStr + batchStr + pageStr + '\n';
}
export async function echoPostMedia({
  ctx,
  artworks,
  currentPage,
  totalPage,
  customTags,
  option,
}: {
  ctx: CommandContext<WrapperContext>;
  artworks: ArtworkInfo[];
  customTags?: string[];
  currentPage?: number;
  totalPage?: number;
  option: { batch: number; page: number; batchSize: number };
}) {
  if (!artworks?.length || !artworks[0]) {
    ctx.reply('出错了？未找到合适的图片');
    return;
  }

  const firstImg = artworks[0];
  firstImg.custom_tags = customTags;
  const total = totalPage ?? 0;

  const caption = infoCmdCaption(firstImg) + getOptCaption({ currentPage, total, option });

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
