/*
  Warnings:

  - You are about to drop the `HomepageService` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HomepageServiceHighlight` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "HomepageServiceHighlight" DROP CONSTRAINT "HomepageServiceHighlight_homepageServiceId_fkey";

-- DropTable
DROP TABLE "HomepageService";

-- DropTable
DROP TABLE "HomepageServiceHighlight";
