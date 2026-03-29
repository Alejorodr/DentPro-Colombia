-- Phase 2: operational unavailability metadata and audit
ALTER TABLE "ProfessionalUnavailability"
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "internalNotes" TEXT,
  ADD COLUMN "updatedByUserId" UUID;

ALTER TABLE "ProfessionalUnavailability"
  ADD CONSTRAINT "ProfessionalUnavailability_updatedByUserId_fkey"
  FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ProfessionalUnavailability_updatedByUserId_idx"
  ON "ProfessionalUnavailability"("updatedByUserId");
