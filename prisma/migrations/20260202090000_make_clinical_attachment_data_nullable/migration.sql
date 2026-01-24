-- Make legacy attachment payload nullable (external storage in use)
ALTER TABLE "ClinicalAttachment" ALTER COLUMN "data" DROP NOT NULL;
