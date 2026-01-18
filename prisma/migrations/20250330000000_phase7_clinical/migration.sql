-- CreateEnum
CREATE TYPE "ClinicalNoteType" AS ENUM ('EVOLUTION', 'OBSERVATION', 'DIAGNOSIS', 'PLAN');

-- CreateEnum
CREATE TYPE "AccessLogAction" AS ENUM ('VIEW', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT');

-- CreateEnum
CREATE TYPE "ClinicDocumentTemplateType" AS ENUM ('CONSENT', 'QUOTE', 'PRESCRIPTION');

-- CreateEnum
CREATE TYPE "LabOrderStatus" AS ENUM ('PENDING', 'ORDERED', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "ClinicalNote" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedByUserId" UUID,
ADD COLUMN     "episodeId" TEXT,
ADD COLUMN     "type" "ClinicalNoteType" NOT NULL DEFAULT 'EVOLUTION';

ALTER TABLE "ClinicalNote" ALTER COLUMN "appointmentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Prescription" ADD COLUMN     "content" JSONB,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedByUserId" UUID,
ADD COLUMN     "episodeId" TEXT,
ADD COLUMN     "issuedAt" TIMESTAMP(3),
ADD COLUMN     "patientId" TEXT,
ADD COLUMN     "professionalId" TEXT;

ALTER TABLE "Prescription" ALTER COLUMN "appointmentId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ClinicalEpisode" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "diagnosis" TEXT,
    "treatmentPlan" TEXT,
    "visibleToPatient" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "updatedByUserId" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" UUID,

    CONSTRAINT "ClinicalEpisode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalAttachment" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "uploadedByUserId" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "checksum" TEXT,
    "visibleToPatient" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" UUID,

    CONSTRAINT "ClinicalAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessLog" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "patientId" TEXT,
    "action" "AccessLogAction" NOT NULL,
    "route" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicDocumentTemplate" (
    "id" TEXT NOT NULL,
    "type" "ClinicDocumentTemplateType" NOT NULL,
    "title" TEXT NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicDocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignedConsent" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedByUserId" UUID NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "SignedConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabOrder" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "status" "LabOrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClinicalNote_episodeId_idx" ON "ClinicalNote"("episodeId");

-- CreateIndex
CREATE INDEX "ClinicalEpisode_patientId_idx" ON "ClinicalEpisode"("patientId");

-- CreateIndex
CREATE INDEX "ClinicalEpisode_professionalId_idx" ON "ClinicalEpisode"("professionalId");

-- CreateIndex
CREATE INDEX "ClinicalEpisode_appointmentId_idx" ON "ClinicalEpisode"("appointmentId");

-- CreateIndex
CREATE INDEX "ClinicalEpisode_date_idx" ON "ClinicalEpisode"("date");

-- CreateIndex
CREATE INDEX "ClinicalEpisode_deletedAt_idx" ON "ClinicalEpisode"("deletedAt");

-- CreateIndex
CREATE INDEX "ClinicalAttachment_episodeId_idx" ON "ClinicalAttachment"("episodeId");

-- CreateIndex
CREATE INDEX "ClinicalAttachment_patientId_idx" ON "ClinicalAttachment"("patientId");

-- CreateIndex
CREATE INDEX "ClinicalAttachment_deletedAt_idx" ON "ClinicalAttachment"("deletedAt");

-- CreateIndex
CREATE INDEX "AccessLog_userId_idx" ON "AccessLog"("userId");

-- CreateIndex
CREATE INDEX "AccessLog_patientId_idx" ON "AccessLog"("patientId");

-- CreateIndex
CREATE INDEX "AccessLog_action_idx" ON "AccessLog"("action");

-- CreateIndex
CREATE INDEX "AccessLog_createdAt_idx" ON "AccessLog"("createdAt");

-- CreateIndex
CREATE INDEX "ClinicDocumentTemplate_type_idx" ON "ClinicDocumentTemplate"("type");

-- CreateIndex
CREATE INDEX "ClinicDocumentTemplate_active_idx" ON "ClinicDocumentTemplate"("active");

-- CreateIndex
CREATE INDEX "SignedConsent_patientId_idx" ON "SignedConsent"("patientId");

-- CreateIndex
CREATE INDEX "SignedConsent_templateId_idx" ON "SignedConsent"("templateId");

-- CreateIndex
CREATE INDEX "LabOrder_episodeId_idx" ON "LabOrder"("episodeId");

-- CreateIndex
CREATE INDEX "Prescription_episodeId_idx" ON "Prescription"("episodeId");

-- CreateIndex
CREATE INDEX "Prescription_patientId_idx" ON "Prescription"("patientId");

-- CreateIndex
CREATE INDEX "Prescription_professionalId_idx" ON "Prescription"("professionalId");

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "ClinicalEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_deletedByUserId_fkey" FOREIGN KEY ("deletedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "ClinicalEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_deletedByUserId_fkey" FOREIGN KEY ("deletedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalEpisode" ADD CONSTRAINT "ClinicalEpisode_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalEpisode" ADD CONSTRAINT "ClinicalEpisode_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalEpisode" ADD CONSTRAINT "ClinicalEpisode_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalEpisode" ADD CONSTRAINT "ClinicalEpisode_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalEpisode" ADD CONSTRAINT "ClinicalEpisode_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalEpisode" ADD CONSTRAINT "ClinicalEpisode_deletedByUserId_fkey" FOREIGN KEY ("deletedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAttachment" ADD CONSTRAINT "ClinicalAttachment_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "ClinicalEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAttachment" ADD CONSTRAINT "ClinicalAttachment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAttachment" ADD CONSTRAINT "ClinicalAttachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAttachment" ADD CONSTRAINT "ClinicalAttachment_deletedByUserId_fkey" FOREIGN KEY ("deletedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessLog" ADD CONSTRAINT "AccessLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessLog" ADD CONSTRAINT "AccessLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignedConsent" ADD CONSTRAINT "SignedConsent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignedConsent" ADD CONSTRAINT "SignedConsent_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ClinicDocumentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignedConsent" ADD CONSTRAINT "SignedConsent_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "ClinicalEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
