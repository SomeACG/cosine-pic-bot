const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 连接到 SQLite 数据库
const dbPath = path.join(__dirname, '../prisma/data.db'); // 根据实际路径调整
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// 创建新表
const createNewTable = `
  CREATE TABLE images_new (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    userid      BIGINT,
    username    TEXT,
    create_time INTEGER,
    platform    TEXT,
    title       TEXT,
    page        INTEGER,
    size        INTEGER,
    filename    TEXT,
    author      TEXT,
    authorid    BIGINT,
    pid         TEXT,
    extension   TEXT,
    rawurl      TEXT,
    thumburl    TEXT,
    r18         BOOLEAN,
    width       INTEGER,
    height      INTEGER,
    guest       BOOLEAN,
    ai          BOOLEAN
  );
`;

// 复制数据到新表
const copyData = `
  INSERT INTO images_new (id, userid, username, create_time, platform, title, page, size, filename, author, authorid, pid, extension, rawurl, thumburl, r18, width, height, guest, ai)
  SELECT id, userid, username, create_time, platform, title, page, size, filename, author, authorid, pid, extension, rawurl, thumburl, r18, width, height, guest, ai
  FROM images;
`;

// 删除旧表
const dropOldTable = `DROP TABLE images;`;

// 重命名新表
const renameTable = `ALTER TABLE images_new RENAME TO images;`;

// 执行上述操作
db.serialize(() => {
  db.run(createNewTable, (err) => {
    if (err) {
      console.error('Error creating new table:', err.message);
    } else {
      console.log('New table created.');
    }
  });

  db.run(copyData, (err) => {
    if (err) {
      console.error('Error copying data:', err.message);
    } else {
      console.log('Data copied to new table.');
    }
  });

  db.run(dropOldTable, (err) => {
    if (err) {
      console.error('Error dropping old table:', err.message);
    } else {
      console.log('Old table dropped.');
    }
  });

  db.run(renameTable, (err) => {
    if (err) {
      console.error('Error renaming table:', err.message);
    } else {
      console.log('New table renamed to original table name.');
    }
  });

  // 更新 create_time 列
  db.all('SELECT id, create_time FROM images', (err, rows) => {
    if (err) {
      throw err;
    }

    rows.forEach((row) => {
      const { id, create_time } = row;
      const createTimeObj = new Date(create_time);
      const createTimeTimestamp = Math.floor(createTimeObj.getTime() / 1000);

      db.run('UPDATE images SET create_time = ? WHERE id = ?', [createTimeTimestamp, id], (err) => {
        if (err) {
          console.error(err.message);
        }
      });
    });

    // 关闭数据库连接
    db.close((err) => {
      if (err) {
        console.error(err.message);
      }
      console.log('Database connection closed.');
    });
  });
});
