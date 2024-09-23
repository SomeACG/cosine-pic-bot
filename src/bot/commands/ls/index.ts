import { WrapperContext } from '@/bot/wrappers/command-wrapper';
import { BotMenuName } from '@/constants/enum';
import { prisma } from '@/utils/db';
import { Menu, MenuRange } from '@grammyjs/menu';
import { CommandMiddleware } from 'grammy';

export const lsManageMenu = new Menu<WrapperContext>(BotMenuName.LS_MANAGE, {
  onMenuOutdated: false,
})
  .dynamic(async () => {
    const res = await prisma.stash.findMany();
    const range = new MenuRange<WrapperContext>();
    for (let i = 0; i < res.length; i++) {
      const item = res[i];
      range
        .text(item?.id + '' ?? '', (ctx) => ctx.reply(`您选择了: ${item?.original_msg}`))
        .text('✅', (ctx) => {
          try {
            ctx.editMessageText(`<code>/post ${item?.original_msg}</code>\n${item?.id}: ${item?.original_msg}`, {
              parse_mode: 'HTML',
            });
          } catch (e: any) {
            console.error(e);
            ctx.reply('出错了');
          }
        })
        .text('🗑️', async (ctx) => {
          try {
            const hasItem = await prisma.stash.findFirst({ where: { id: item?.id } });
            if (hasItem) {
              const res = await prisma.stash.delete({ where: { id: item?.id } });
              ctx.menu.update();
              if (!res) ctx.reply('删除暂存失败');
            } else ctx.reply('不存在该暂存');
          } catch (e: any) {
            console.error(e);
            ctx.reply('删除出错了');
          }
        })
        .row();
    }
    return range;
  })
  .text('返回', async (ctx) => {
    try {
      const res = await prisma.stash.findMany();
      const initMsg = '以下是暂存列表:\n' + res.map((item) => `<b>${item.id}</b>: ${item.original_msg}\n`).join('');
      ctx.editMessageText(initMsg, { parse_mode: 'HTML' });
    } catch (e: any) {
      console.log(e);
    }
  })
  .text('关闭', async (ctx) => ctx.menu.close());
// /ls 查看所有暂存
const lsCommand: CommandMiddleware<WrapperContext> = async (ctx) => {
  try {
    const res = await prisma.stash.findMany();
    if (!res) return ctx.reply('暂存列表为空！');
    const initMsg = '以下是暂存列表:\n' + res.map((item) => `<b>${item.id}</b>: ${item.original_msg}\n`).join('');
    return await ctx.reply(initMsg, {
      reply_markup: lsManageMenu,
      parse_mode: 'HTML',
      reply_parameters: { message_id: ctx.message?.message_id ?? 0 },
    });
  } catch (e: any) {
    await ctx.deleteWaiting();
    return await ctx.reply(e?.message ?? '查看暂存失败！原因未知。');
  }
};

export default lsCommand;
