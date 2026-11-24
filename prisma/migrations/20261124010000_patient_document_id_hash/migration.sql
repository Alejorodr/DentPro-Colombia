-- DOG-18: hash de búsqueda del documento de identidad (el documento queda cifrado).
ALTER TABLE "PatientProfile" ADD COLUMN "documentIdHash" TEXT;

CREATE INDEX "PatientProfile_documentIdHash_idx" ON "PatientProfile"("documentIdHash");
