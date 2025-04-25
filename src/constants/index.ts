import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const BOT_TOKEN = process.env.BOT_TOKEN ?? '';
export const ADMIN_CHAT_IDS = (process.env.ADMIN_CHAT_IDS ? JSON.parse(process.env.ADMIN_CHAT_IDS) : []) as number[];
export const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? '';
export const PIXIV_COOKIE = process.env.PIXIV_COOKIE || '';
export const TEMP_DIR = path.resolve(__dirname, '../../', process.env.TEMP_DIR || 'temp');
export const DOWNLOAD_DIR = path.resolve(__dirname, '../../', process.env.DOWNLOAD_DIR || 'download');
export const THUMB_DIR = path.resolve(__dirname, '../../', process.env.THUMB_DIR || 'thumb');
export const S3_OUTPUT_DIR = process.env.S3_OUTPUT_DIR || 's3_output';

export const DEV_MODE = process.env.DEV_MODE === 'true';
export const CHANNEL_INFO_URL = process.env.CHANNEL_INFO_URL ?? '';
export const CHANNEL_INFO_NAME = process.env.CHANNEL_INFO_NAME ?? '';
export const SHOW_CHANNEL_INFO = process.env.SHOW_CHANNEL_INFO === 'true';

export const BOT_CHANNEL_ID = process.env.BOT_CHANNEL_ID ?? '';
export const BOT_CHANNEL_COMMENT_GROUP_ID = process.env.BOT_CHANNEL_COMMENT_GROUP_ID ?? '';

// S3 相关
export const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || '';
export const S3_ENDPOINT = process.env.S3_ENDPOINT || '';
export const S3_REGION = process.env.S3_REGION || '';
export const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL || '';
export const ITEMS_PER_PAGE = 10; // 每页显示的项目数
export const ENABLE_S3_BACKUP = process.env.ENABLE_S3_BACKUP === 'true';
