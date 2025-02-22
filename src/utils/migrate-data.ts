/**
 * 迁移数据 从旧数据库 SQLite 迁移到新数据库 PostgreSQL
 * 迁移完了这个脚本其实没用了但是先留着。
 */
import { PrismaClient } from '@prisma/client';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const prisma = new PrismaClient();

export async function migrateData() {
  // 连接 SQLite 数据库
  const db = await open({
    filename: path.join(process.cwd(), 'prisma/data.db'),
    driver: sqlite3.Database,
  });

  try {
    // 清空目标数据库表
    console.log('Cleaning target database tables...');
    await prisma.$executeRaw`TRUNCATE TABLE "images" RESTART IDENTITY CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "imagetags" RESTART IDENTITY CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "stash" RESTART IDENTITY CASCADE`;

    // 读取 images 表
    const images = await db.all('SELECT * FROM images');
    console.log(`Found ${images.length} images to migrate`);

    // 读取 imagetags 表
    const imageTags = await db.all('SELECT * FROM imagetags');
    console.log(`Found ${imageTags.length} image tags to migrate`);

    // 读取 stash 表
    const stashes = await db.all('SELECT * FROM stash');
    console.log(`Found ${stashes.length} stash entries to migrate`);

    // 迁移 images
    console.log('Migrating images...');
    const processedImages = images.map((image) => ({
      ...image,
      create_time: image.create_time ? new Date(image.create_time) : null,
      guest: Boolean(image.guest),
      r18: Boolean(image.r18),
      ai: Boolean(image.ai),
      userid: image.userid ? BigInt(image.userid).toString() : null,
      authorid: image.authorid ? BigInt(image.authorid).toString() : null,
    }));

    // 批量创建记录，每500条一批
    const BATCH_SIZE = 500;
    for (let i = 0; i < processedImages.length; i += BATCH_SIZE) {
      const batch = processedImages.slice(i, i + BATCH_SIZE);
      await prisma.image.createMany({
        data: batch,
        skipDuplicates: true,
      });
      console.log(`Migrated images ${i + 1} to ${Math.min(i + BATCH_SIZE, processedImages.length)}`);
    }

    // 迁移 imagetags
    console.log('Migrating image tags...');
    for (let i = 0; i < imageTags.length; i += BATCH_SIZE) {
      const batch = imageTags.slice(i, i + BATCH_SIZE);
      await prisma.imageTag.createMany({
        data: batch,
        skipDuplicates: true,
      });
      console.log(`Migrated tags ${i + 1} to ${Math.min(i + BATCH_SIZE, imageTags.length)}`);
    }

    // 迁移 stash
    console.log('Migrating stash entries...');
    const processedStashes = stashes.map((stash) => ({
      ...stash,
      create_time: stash.create_time ? new Date(stash.create_time) : null,
    }));

    await prisma.stash.createMany({
      data: processedStashes,
      skipDuplicates: true,
    });

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    await db.close();
    await prisma.$disconnect();
  }
}

migrateData().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
