import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const BOT_TOKEN = process.env.BOT_TOKEN ?? '';
export const ADMIN_CHAT_IDS = (process.env.ADMIN_CHAT_IDS ? JSON.parse(process.env.ADMIN_CHAT_IDS) : []) as number[];
export const PIXIV_COOKIE = process.env.PIXIV_COOKIE || '';
export const TEMP_DIR = path.resolve(__dirname, '../../', process.env.TEMP_DIR || 'temp');
export const DOWNLOAD_DIR = path.resolve(__dirname, '../../', process.env.DOWNLOAD_DIR || 'download');
export const THUMB_DIR = path.resolve(__dirname, '../../', process.env.THUMB_DIR || 'thumb');

export const DEV_MODE = process.env.DEV_MODE ?? false;
export const BOT_CHANNEL_ID = process.env.BOT_CHANNEL_ID ?? '';
export const BOT_CHANNEL_COMMENT_GROUP_ID = process.env.BOT_CHANNEL_COMMENT_GROUP_ID ?? '';

// 暂时还没接入
export const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || '';
export const S3_ENDPOINT = process.env.S3_ENDPOINT || '';
export const S3_REGION = process.env.S3_REGION || '';
