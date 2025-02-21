import { WrapperContext } from '@/bot/wrappers/command-wrapper';
import { ADMIN_CHAT_IDS, ADMIN_USERNAME } from '@/constants';
import { BotMenuName, OperateState } from '@/constants/enum';
import { getArtworks } from '@/utils/bot';
import { infoCmdCaption } from '@/utils/caption';
import { Menu } from '@grammyjs/menu';
import { CommandMiddleware } from 'grammy';
import postByUrl from '../utils/postByUrl';

export const submitMenu = new Menu<WrapperContext>(BotMenuName.SUBMIT).text('✅ Accept', async (ctx) => {
  // console.log('======= Accept click =======\n');
  // console.dir(ctx, { depth: null });
  const userId = ctx.from.id;
  const text = ctx.update.callback_query.message?.reply_to_message?.text ?? '';
  if (!text) return;
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const urls = text.match(urlPattern);
  if (!urls?.length) return;
  // 检查点击用户是否是指定的管理员
  if (ADMIN_CHAT_IDS.includes(userId)) {
    // 通过投稿
    await ctx.reply('已通过投稿！', {
      reply_parameters: { message_id: ctx.update.callback_query.message?.reply_to_message?.message_id ?? 0 },
    });
    await postByUrl(ctx, urls[0]);
  }
});

export async function handleSubmit(ctx: WrapperContext, url: string) {
  const { state, msg, result: artworksInfo } = await getArtworks(url);

  if (state === OperateState.Fail) return ctx.reply(msg ?? 'unknown error', { parse_mode: 'HTML' });

  if (!artworksInfo?.length || !artworksInfo[0]) return ctx.reply('出错了？未找到合适的图片');
  const infoCaption = await infoCmdCaption(artworksInfo[0]);
  await ctx.reply(`感谢投稿! 正在召唤 ${ADMIN_USERNAME}\n` + infoCaption, {
    parse_mode: 'HTML',
    reply_markup: submitMenu,
    reply_parameters: { message_id: ctx.message?.message_id ?? 0 },
  });

  return ctx.deleteWaiting();
}

// 投稿
const submitCommand: CommandMiddleware<WrapperContext> = async (ctx) => {
  const args = ctx.command.args;
  if (!args?.length) return ctx.reply('请携带要投稿的 url');

  const url = args.shift() ?? '';
  return handleSubmit(ctx, url);
};

export default submitCommand;
