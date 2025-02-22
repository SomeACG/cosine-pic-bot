import bot from './bot';
import logger from './utils/logger';
// import { migrateData } from './utils/migrate-data';
// migrateData().catch((e) => {
//   console.error('Migration failed:', e);
//   process.exit(1);
// });

bot.start();
logger.info('BOT 已启动...');
