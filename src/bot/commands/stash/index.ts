import { WrapperContext } from '@/bot/wrappers/command-wrapper';
import { prisma } from '@/utils/db';
import { CommandMiddleware } from 'grammy';

// /stash url [?batch_?page] [?#tag1] [?#tag2]
// eg: /stash https://www.pixiv.net/artworks/118299613 0_0  #tag1 #tag2 跟没传一样效果，尝试全发
// eg: /stash https://www.pixiv.net/artworks/118299613 3_2  #tag1 #tag2 // 第3批的第2张
// eg: /stash https://www.pixiv.net/artworks/118299613 0_3  #tag1 #tag2 // 每批的第3张
// eg: /stash https://www.pixiv.net/artworks/118299613 3_0  #tag1 #tag2 // 第3批的所有张
// page 为 0 表示该批次所有图，batch 为 0 表示所有批次，page 为 1 表示第 batch 的第1张
const stashCommand: CommandMiddleware<WrapperContext> = async (ctx) => {
  const args = ctx.command.args;
  if (!args?.length) return ctx.reply('请携带要预览的 url');
  try {
    const hasStash = await prisma.stash.findFirst({
      where: {
        original_msg: ctx.command.original_msg,
      },
    });
    if (hasStash) return ctx.reply('该 url 暂存已存在！可通过 /ls 查看');
    const res = await prisma.stash.create({
      data: {
        original_msg: ctx.command.original_msg,
        create_time: new Date(),
      },
    });
    if (res) return ctx.reply('暂存成功！可通过 /ls 查看');
    else return ctx.reply('暂存失败！插入数据库失败');
  } catch (e: any) {
    await ctx.deleteWaiting();
    throw Error(e?.message ?? '暂存失败！原因未知。');
  }
};

export default stashCommand;
