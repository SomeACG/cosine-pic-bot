-- CreateTable
CREATE TABLE "images" (
    "id" SERIAL NOT NULL,
    "userid" BIGINT,
    "username" TEXT,
    "create_time" TIMESTAMP(3),
    "platform" TEXT,
    "title" TEXT,
    "page" INTEGER,
    "size" INTEGER,
    "filename" TEXT,
    "author" TEXT,
    "authorid" BIGINT,
    "pid" TEXT,
    "extension" TEXT,
    "rawurl" TEXT,
    "thumburl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "guest" BOOLEAN DEFAULT false,
    "r18" BOOLEAN DEFAULT false,
    "ai" BOOLEAN DEFAULT false,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imagetags" (
    "id" SERIAL NOT NULL,
    "pid" TEXT,
    "tag" TEXT,

    CONSTRAINT "imagetags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stash" (
    "id" SERIAL NOT NULL,
    "original_msg" TEXT,
    "create_time" TIMESTAMP(3),

    CONSTRAINT "stash_pkey" PRIMARY KEY ("id")
);
