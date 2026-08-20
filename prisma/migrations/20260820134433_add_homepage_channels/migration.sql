-- CreateEnum
CREATE TYPE "HomepageContentPlacement" AS ENUM ('INFOBAR', 'FLOATING', 'FOOTER', 'BOOKING');

-- CreateEnum
CREATE TYPE "HomepageChannelType" AS ENUM ('WHATSAPP', 'PHONE', 'EMAIL');

-- AlterTable
ALTER TABLE "HomepageSocialLink" ADD COLUMN     "placements" "HomepageContentPlacement"[];

-- CreateTable
CREATE TABLE "HomepageChannel" (
    "id" TEXT NOT NULL,
    "type" "HomepageChannelType" NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "placements" "HomepageContentPlacement"[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageChannel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HomepageChannel_isActive_sortOrder_idx" ON "HomepageChannel"("isActive", "sortOrder");
