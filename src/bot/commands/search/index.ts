import { WrapperContext } from '@/bot/wrappers/command-wrapper';
import { CommandMiddleware } from 'grammy';
import { ADMIN_CHAT_IDS } from '@/constants';
import { searchIndexUpdater } from '@/utils/search-index';

enum SearchAction {
  Sync = 'sync',
  Status = 'status',
  Rebuild = 'rebuild',
}

function isValidSearchAction(value: string | undefined): value is SearchAction {
  return value !== undefined && Object.values(SearchAction).includes(value as SearchAction);
}

const searchCommand: CommandMiddleware<WrapperContext> = async (ctx) => {
  const userId = ctx.from?.id;
  const args = ctx.command.args;
  const actionInput = args.shift();
  const action = isValidSearchAction(actionInput) ? actionInput : SearchAction.Status;

  // 检查是否是管理员
  if (!userId || !ADMIN_CHAT_IDS.includes(userId)) {
    return ctx.reply('抱歉，只有管理员可以执行此命令');
  }

  // 检查搜索索引API是否可用
  if (!searchIndexUpdater.isEnabled()) {
    return ctx.reply('搜索索引API未配置 (SEARCH_API_BASE_URL)，无法执行搜索索引操作');
  }

  try {
    switch (action) {
      case SearchAction.Sync: {
        // 获取同步时间参数，默认1小时
        const hoursParam = args.shift();
        const hours = hoursParam ? parseInt(hoursParam, 10) : 1;

        if (isNaN(hours) || hours <= 0 || hours > 168) {
          // 最多7天
          return ctx.reply('同步时间参数无效，请输入1-168之间的小时数');
        }

        await ctx.wait(`正在同步最近 ${hours} 小时的图片到搜索索引...`);

        const success = await searchIndexUpdater.syncRecentImages(hours);

        if (success) {
          await ctx.reply(`✅ 搜索索引同步成功！已同步最近 ${hours} 小时的图片`);
        } else {
          await ctx.reply('❌ 搜索索引同步失败，请查看日志了解详细信息');
        }
        break;
      }

      case SearchAction.Status: {
        await ctx.wait('正在获取搜索索引状态...');

        const status = await searchIndexUpdater.getIndexStatus();

        if (status) {
          const { totalImages = '未知', indexedImages = '未知', indexHealth = '未知', lastSyncTime = '未知' } = status;

          const healthEmoji = indexHealth === 'healthy' ? '✅' : indexHealth === 'partial' ? '⚠️' : '❌';

          const statusMessage = [
            '📊 搜索索引状态报告',
            '',
            `${healthEmoji} 索引健康度: ${indexHealth}`,
            `📸 数据库图片总数: ${totalImages}`,
            `🔍 已索引图片数量: ${indexedImages}`,
            `🕐 最后同步时间: ${lastSyncTime}`,
          ].join('\n');

          await ctx.reply(statusMessage);
        } else {
          await ctx.reply('❌ 获取搜索索引状态失败，请查看日志了解详细信息');
        }
        break;
      }

      case SearchAction.Rebuild: {
        // 重建索引需要二次确认
        const confirmParam = args.shift();
        if (confirmParam !== 'confirm') {
          return ctx.reply(
            '⚠️ 重建索引将删除现有索引并重新创建，这可能需要很长时间！\n' + '如果确定要执行，请使用: /search rebuild confirm',
          );
        }

        await ctx.wait('正在重建搜索索引，这可能需要几分钟时间...');

        const success = await searchIndexUpdater.rebuildIndex();

        if (success) {
          await ctx.reply('✅ 搜索索引重建成功！');
        } else {
          await ctx.reply('❌ 搜索索引重建失败，请查看日志了解详细信息');
        }
        break;
      }

      default:
        return ctx.reply(
          '🔍 搜索索引管理命令\n\n' +
            '用法:\n' +
            '• /search status - 查看索引状态\n' +
            '• /search sync [小时数] - 同步最近的图片 (默认1小时)\n' +
            '• /search rebuild confirm - 重建整个索引 (谨慎使用)\n\n' +
            '示例:\n' +
            '• /search sync 2 - 同步最近2小时的图片\n' +
            '• /search sync 24 - 同步最近24小时的图片',
        );
    }
  } catch (error: any) {
    console.error('搜索索引命令执行错误:', error);
    await ctx.reply(`❌ 执行搜索索引操作时出错: ${error.message}`);
  }

  return await ctx.deleteWaiting();
};

export default searchCommand;
