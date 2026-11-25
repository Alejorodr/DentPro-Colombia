-- DOG-34: campos de normativa de salud colombiana.

-- Tipo de identificación del paciente (códigos de la tabla RIPS). Por defecto CC:
-- los pacientes existentes quedan con cédula de ciudadanía, que es el caso habitual.
CREATE TYPE "DocumentType" AS ENUM ('CC', 'TI', 'RC', 'CN', 'CE', 'PA', 'PE', 'PT', 'DE', 'CD', 'SC', 'AS', 'MS');
ALTER TABLE "PatientProfile" ADD COLUMN "documentType" "DocumentType" NOT NULL DEFAULT 'CC';

-- Registro RETHUS del profesional: opcional, se puede completar después del alta.
ALTER TABLE "ProfessionalProfile" ADD COLUMN "rethusNumber" TEXT;

-- Código CUPS del servicio: uno por servicio, opcional.
ALTER TABLE "Service" ADD COLUMN "cupsCode" TEXT;
