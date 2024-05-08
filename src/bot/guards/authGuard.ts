import { ADMIN_CHAT_IDS } from '@/constants';
import logger from '@/utils/logger';
import { CommandMiddleware } from 'grammy';
import { WrapperContext } from '../wrappers/command-wrapper';

const authGuard: CommandMiddleware<WrapperContext> = async (ctx, next) => {
  logger.info(`初始化 authGuard`);
  if (!ctx.from?.id) return false;
  if (ADMIN_CHAT_IDS.includes(ctx.from.id)) {
    // 是管理员
    await next();
    return true;
  }
  logger.info(`${ctx.from.id} 没有权限但还是勇猛的尝试了`);
  ctx.reply('[权限不足] 这种事人家确实帮不上忙呢，可以找管理员试试哟～');
  return false;
};

export default authGuard;
