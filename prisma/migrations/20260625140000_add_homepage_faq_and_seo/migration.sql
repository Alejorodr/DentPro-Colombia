-- AlterTable: Add SEO fields to HomepageSettings
ALTER TABLE "HomepageSettings" ADD COLUMN "metaTitle" TEXT;
ALTER TABLE "HomepageSettings" ADD COLUMN "metaDescription" TEXT;

-- CreateTable: HomepageFaq
CREATE TABLE "HomepageFaq" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageFaq_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HomepageFaq_isActive_sortOrder_idx" ON "HomepageFaq"("isActive", "sortOrder");
