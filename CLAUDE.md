n# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Package Management
- Uses `pnpm` as the package manager
- Install dependencies: `pnpm i`

### Database Operations (Prisma + PostgreSQL)
- Initialize database (first time): `pnpm db:init` 
- Push schema changes: `pnpm db:push`
- Generate Prisma client: `npx prisma generate`
- View database: `pnpm db:view` (opens Prisma Studio)
- Convert old data migration: `pnpm db:convert`

### Application Lifecycle
- Development mode: `pnpm start` (direct terminal execution)
- Production mode: `pnpm pm2` (PM2 daemon process)
- PM2 management: `pnpm pm2:restart`, `pnpm pm2:stop`, `pnpm pm2:log`

### Code Quality
- Lint and fix: `pnpm lint` (ESLint with auto-fix)
- Run tests: `pnpm test` (Jest testing twitter functionality)

### Utilities
- Generate changelog: `pnpm change` (git-cliff)

## Architecture Overview

This is a **Telegram bot for artwork sharing** built with TypeScript, Grammy (Telegram bot framework), Prisma ORM, and PostgreSQL. The bot manages artwork from Pixiv and Twitter platforms.

### Core Structure

#### `/src/app.ts`
Main entry point that starts the bot service and initializes logging.

#### `/src/bot/` - Telegram Bot Logic
- `index.ts`: Main bot setup with Grammy framework, command registration, and event handlers
- `commands/`: Individual bot command implementations
  - `echo/`: Preview artwork info before posting
  - `post/`: (Admin) Post artwork to channel
  - `submit/`: User submission workflow
  - `random/`: Random artwork retrieval
  - `stash/`: (Admin) Temporary URL storage
  - `ls/`: (Admin) View stashed URLs
  - `compress/`: (Admin) Image compression utilities
  - `s3upload/`: (Admin) S3 cloud storage integration
- `guards/authGuard.ts`: Permission system for admin-only commands
- `wrappers/command-wrapper.ts`: Context wrapper for enhanced command handling

#### `/src/api/` - External Platform Integration
- `pixiv/`: Pixiv artwork API integration
- `twitter-web-api/`: Twitter/X artwork scraping and API
- `request/`: HTTP request utilities and platform-specific handlers

#### `/src/utils/` - Core Utilities
- `db.ts`: Prisma database client
- `logger.ts`: Pino-based logging system
- `image.ts`: Image processing (@napi-rs/image)
- `s3.ts`: AWS S3 integration
- `caption.ts`: Artwork caption generation
- `url.ts`: URL parsing and validation

#### `/src/types/` - TypeScript Definitions
- `Artwork.ts`, `User.ts`: Core data models
- `pixiv.ts`, `FxTwitter.ts`: Platform-specific types

### Database Schema (Prisma)
- **Image**: Core artwork metadata (platform, author, dimensions, URLs, tags)
- **ImageTag**: Tag associations
- **Stash**: Temporary URL storage for admin workflow

### Key Features
- Multi-platform artwork aggregation (Pixiv, Twitter)
- Admin workflow with stashing and approval
- Image compression and S3 storage
- Duplicate detection and management
- Random artwork serving
- Tag-based organization

### Directory Structure
- `temp/`: Temporary image storage
- `download/`: Downloaded original images
- `output/`: Compressed images for distribution
- `thumb/`: Thumbnail generation
- `prisma/`: Database schema and migrations

### Environment Variables
Key configuration in `.env`:
- `BOT_TOKEN`: Telegram bot token
- `ADMIN_CHAT_ID`: Admin user IDs (array)
- `BOT_CHANNEL_ID`: Target channel for posts
- `DATABASE_URL`: PostgreSQL connection string
- `PIXIV_COOKIE`: Authentication for Pixiv API