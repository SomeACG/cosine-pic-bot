import { WrapperContext } from '@/bot/wrappers/command-wrapper';
import { BOT_CHANNEL_ID, THUMB_DIR } from '@/constants';
import { CommandType } from '@/constants/enum';
import { globalAwaitReplyObj } from '@/constants/globalData';
import { ArtworkInfo } from '@/types/Artwork';
import { PostUserInfo } from '@/types/User';
import { downloadFileArray, getDirByCmdType } from '@/utils/bot';
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
export async function postMedia({
  ctx,
  artworks,
  currentPage,
  totalPage,
  customTags,
  option,
  cmdType = CommandType.Echo,
  userInfo,
  saveRes,
}: {
  ctx: CommandContext<WrapperContext>;
  artworks: ArtworkInfo[];
  customTags?: string[];
  currentPage?: number;
  totalPage?: number;
  option: { batch: number; page: number; batchSize: number };
  cmdType: CommandType;
  userInfo?: PostUserInfo;
  saveRes?:
    | {
        id: number;
      }[]
    | undefined;
}) {
  if (!artworks?.length || !artworks[0]) {
    ctx.reply('出错了？未找到合适的图片');
    return;
  }

  const firstImg = artworks[0];
  firstImg.custom_tags = customTags;
  const total = totalPage ?? 0;
  const { userid, username } = userInfo ?? {};
  const viaInfo =
    cmdType === CommandType.Submit ? `\n由 ${username ?? `<a href="tg://user?id=${userid}">匿名用户</a>`} 投稿` : '';
  const infoCaption = await infoCmdCaption(firstImg, saveRes);
  const caption = infoCaption + getOptCaption({ currentPage, total, option }) + viaInfo;

  const originFileNames = await downloadFileArray(artworks, cmdType);
  const platform = artworks[0].source_type;
  const originFiles = originFileNames.map((item) => new InputFile(path.resolve(getDirByCmdType(cmdType), platform, item)));
  const thumbFiles = originFileNames.map((item) => new InputFile(path.resolve(THUMB_DIR, platform, item)));

  const thumbMedias = thumbFiles.map((file, idx) =>
    InputMediaBuilder.photo(file, idx === 0 ? { has_spoiler: artworks[0]?.r18, caption, parse_mode: 'HTML' } : {}),
  );
  const originMedias = originFiles.map((file) => InputMediaBuilder.document(file));

  if ([CommandType.Post, CommandType.Submit].includes(cmdType)) {
    const res = await ctx.api.sendMediaGroup(BOT_CHANNEL_ID, thumbMedias);
    globalAwaitReplyObj[res[0]?.message_id ?? 0] = { medias: originMedias }; // 等监听到 再回复
    const chatID = res[0]?.sender_chat?.id.toString().replace(/^-100/, '');
    const msgID = res[0]?.message_id;
    if (cmdType === CommandType.Post)
      await ctx.directlyReply(`成功发送～ <a href="${`https://t.me/c/${chatID}/${msgID}`}">点击查看</a>`, 'HTML');
  } else {
    await ctx.replyWithMediaGroup(thumbMedias, {
      reply_to_message_id: ctx.message?.message_id,
    });
    await ctx.replyWithMediaGroup(originMedias, {
      reply_to_message_id: ctx.message?.message_id,
    });
  }
}
