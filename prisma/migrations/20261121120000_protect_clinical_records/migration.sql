-- Phase 1 (plan-refuerzo-2026-11-20): prevent cascade deletion of clinical records.
-- Changes ON DELETE CASCADE -> ON DELETE RESTRICT; ON UPDATE CASCADE unchanged.
-- DropForeignKey
ALTER TABLE "ProfessionalProfile" DROP CONSTRAINT "ProfessionalProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "PatientProfile" DROP CONSTRAINT "PatientProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "ClinicalNote" DROP CONSTRAINT "ClinicalNote_authorUserId_fkey";

-- DropForeignKey
ALTER TABLE "MedicalAllergy" DROP CONSTRAINT "MedicalAllergy_patientId_fkey";

-- DropForeignKey
ALTER TABLE "SignedConsent" DROP CONSTRAINT "SignedConsent_patientId_fkey";

-- DropForeignKey
ALTER TABLE "SignedConsent" DROP CONSTRAINT "SignedConsent_templateId_fkey";

-- DropForeignKey
ALTER TABLE "SignedConsent" DROP CONSTRAINT "SignedConsent_acceptedByUserId_fkey";

-- AddForeignKey
ALTER TABLE "ProfessionalProfile" ADD CONSTRAINT "ProfessionalProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientProfile" ADD CONSTRAINT "PatientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalAllergy" ADD CONSTRAINT "MedicalAllergy_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignedConsent" ADD CONSTRAINT "SignedConsent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignedConsent" ADD CONSTRAINT "SignedConsent_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ClinicDocumentTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignedConsent" ADD CONSTRAINT "SignedConsent_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

