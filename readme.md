# cosine-pic-bot

[NahidaBot](https://github.com/NahidaBot/Nahida_Picbot) 的重写+修改版，使用 node + ts + [grammy](https://grammy.dev/zh/)

用于频道 [@CosineGallery](https://t.me/CosineGallery)

## 开发步骤

如果是 NahidaBot 迁移过来，把 data.db 放到prisma文件夹下后运行

```bash
pnpm db:convert # 原本的老数据进行转换
```

启动

```bash
pnpm i
pnpm db:init # 如果是全新启动，第一次启动前使用，初始化数据库， 见 [prisma](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production#create-and-apply-migrations) 

pnpm pm2 # pm2 启动守护进程，配置文件见 ecosystem.config.js
#or
pnpm start # 直接终端起方便调试，可以 Ctrl+C 中断
```

其他命令（问就是个人习惯）：

```bash
pnpm pm2:stop # = pm2 stop ecosystem.config.js
pnpm pm2:restart # = pm2 restart ecosystem.config.js
pnpm pm2:log # = pm2 log ecosystem.config.js
```

.env.example 复制一份变成 .env，填入自己的环境变量

```bash
BOT_TOKEN=                  # TG 机器人token
ADMIN_CHAT_ID=[]              # 管理员的 Chat ID 数组，可添加多个管理员，管理员可执行post操作
ADMIN_USERNAME=@YourUsername    # admin username 别人投稿的时候艾特

DATABASE_URL="file:./data.db" # 不用改 ｜ 目前是使用 SQLite 的话就是 "file:./dev.db" 用别的数据库的话就得改改 provider 之类的了日后再说了

DEV_MODE=false                             # 开发时使用，开启则不判断图片重复。

BOT_CHANNEL_ID=@YourPicChannel             # 发图的频道
BOT_CHANNEL_COMMENT_GROUP_ID=-10012341234  # 频道关联的评论群组

TEMP_DIR=temp              # 存 echo 命令预览图的文件夹（原图）
DOWNLOAD_DIR=download      # 存 post 命令发出去的图（原图）
THUMB_DIR=thumb                 # 缩略图 作为10M以下的Photo发出去
PIXIV_COOKIE=                   # Pixiv 的网站 Cookie
```

s3 上传图片 & docker 部署日后再说，先达到能用的程度。

## 已实现功能

- /echo 预览图信息
- /post 发图
- /submit 投稿
- /del 删除图片信息

## 致敬🫡

- rex 的 node 代码参考 [SomeACG-Bot](https://github.com/SomeACG/SomeACG-Bot)
- Nahida Picbot 的 功能参考 [Nahida_Picbot](https://github.com/NahidaBot/Nahida_Picbot)
