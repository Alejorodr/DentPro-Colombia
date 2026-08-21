-- AlterTable
ALTER TABLE "ProfessionalProfile" ADD COLUMN     "homepageBioShort" TEXT,
ADD COLUMN     "homepageImageAlt" TEXT,
ADD COLUMN     "homepageImageUrl" TEXT,
ADD COLUMN     "homepageSortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "showOnHomepage" BOOLEAN NOT NULL DEFAULT false;
