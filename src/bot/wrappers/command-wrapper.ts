import { CommandEntity } from '@/constants/types';
import logger from '@/utils/logger';
import { parseParams } from '@/utils/param-parser';
import { Api, Context } from 'grammy';
import {
  ForceReply,
  InlineKeyboardMarkup,
  Message,
  ParseMode,
  ReplyKeyboardMarkup,
  ReplyKeyboardRemove,
  Update,
  UserFromGetMe,
} from 'grammy/types';

export class WrapperContext extends Context {
  waiting_message?: Message;
  command: CommandEntity;
  isReply: boolean;
  reply_to_message?: Message.CommonMessage;

  constructor(update: Update, api: Api, me: UserFromGetMe) {
    super(update, api, me);
    this.command = parseParams(update.message?.text ?? '');
    if (update.message?.reply_to_message) {
      this.isReply = true;
      this.reply_to_message = update.message.reply_to_message;
    } else this.isReply = false;
  }

  autoDelete(timeout?: number) {
    if (!timeout) timeout = 20000;
    setTimeout(async () => {
      if (this.waiting_message) {
        try {
          await this.deleteMessages([this?.waiting_message?.message_id]);
        } catch (e) {
          logger.error('自动删除消息出错', e);
        }
      }
    }, timeout);
  }

  async directlyReply(
    message: string,
    parse_mode?: ParseMode,
    reply_markup?: InlineKeyboardMarkup | ReplyKeyboardMarkup | ReplyKeyboardRemove | ForceReply,
  ) {
    return await this.reply(message, {
      reply_to_message_id: this.chat?.type === 'private' ? undefined : this.message?.message_id,
      parse_mode: parse_mode,
      reply_markup,
    });
  }

  async wait(message: string, auto_delete?: boolean, parse_mode?: ParseMode) {
    if (!this.waiting_message) this.waiting_message = await this.directlyReply(message, parse_mode);
    if (auto_delete) this.autoDelete();
  }

  async resolveWait(message: string, parse_mode?: ParseMode) {
    if (this.waiting_message)
      await this.api.editMessageText(this.waiting_message.chat.id, this.waiting_message.message_id, message, {
        parse_mode: parse_mode,
      });
    else await this.directlyReply(message, parse_mode);
  }

  async deleteWaiting() {
    if (this.waiting_message) this.deleteMessages([this.waiting_message.message_id]);
  }
}
