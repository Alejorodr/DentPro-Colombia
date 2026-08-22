-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "homepageSortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "iconKey" TEXT,
ADD COLUMN     "showOnHomepage" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ServiceHighlight" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ServiceHighlight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceHighlight_serviceId_sortOrder_idx" ON "ServiceHighlight"("serviceId", "sortOrder");

-- AddForeignKey
ALTER TABLE "ServiceHighlight" ADD CONSTRAINT "ServiceHighlight_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
