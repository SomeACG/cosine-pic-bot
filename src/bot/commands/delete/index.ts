import { WrapperContext } from '@/bot/wrappers/command-wrapper';
import { OperateState } from '@/constants/enum';
import { getArtworks } from '@/utils/bot';
import { prisma } from '@/utils/db';
import { CommandMiddleware } from 'grammy';

const deleteCommand: CommandMiddleware<WrapperContext> = async (ctx) => {
  const args = ctx.command.args;
  if (!args?.length) return ctx.reply('请携带待删除的 url');

  const url = args.shift() ?? ''; // TODO: Url validation

  const { state, msg, result: artworksInfo } = await getArtworks(url);

  if (state === OperateState.Fail) return ctx.reply(msg ?? 'unknown error', { parse_mode: 'HTML' });

  if (!artworksInfo?.length || !artworksInfo[0]) return ctx.reply('出错了？未找到合适的图片');

  const res = await prisma.image.deleteMany({ where: { pid: { in: artworksInfo.map((a) => a.pid) } } });
  const postUrl = artworksInfo[0]?.post_url;
  return ctx.resolveWait(`成功删除数据库中图片 <a href="${postUrl}">${postUrl}</a> ${res.count} 条记录`, 'HTML');
};

export default deleteCommand;
