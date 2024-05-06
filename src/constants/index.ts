import dotenv from 'dotenv';

dotenv.config();

export const BOT_TOKEN = process.env.BOT_TOKEN ?? '';
export const ADMIN_CHAT_IDS = (process.env.ADMIN_CHAT_IDS ? JSON.parse(process.env.ADMIN_CHAT_IDS) : []) as number[];

// 暂时还没接入
export const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || '';
export const S3_ENDPOINT = process.env.S3_ENDPOINT || '';
export const S3_REGION = process.env.S3_REGION || '';
