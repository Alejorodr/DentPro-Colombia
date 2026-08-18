-- CreateTable
CREATE TABLE "HomepageNavLink" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageNavLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HomepageNavLink_isActive_sortOrder_idx" ON "HomepageNavLink"("isActive", "sortOrder");
