-- DropIndex
DROP INDEX "Prescription_patientId_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordChangedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ClinicalAttachment" DROP COLUMN "url",
ADD COLUMN     "data" BYTEA;

