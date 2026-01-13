-- CreateEnum
CREATE TYPE "InsuranceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'UNKNOWN');

-- AlterTable
ALTER TABLE "PatientProfile"
  ADD COLUMN "dateOfBirth" TIMESTAMP(3),
  ADD COLUMN "gender" TEXT,
  ADD COLUMN "insuranceProvider" TEXT,
  ADD COLUMN "insuranceStatus" "InsuranceStatus",
  ADD COLUMN "address" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "avatarUrl" TEXT,
  ADD COLUMN "patientCode" TEXT;

-- CreateTable
CREATE TABLE "Service" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "priceCents" INTEGER NOT NULL,
  "durationMinutes" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "specialtyId" TEXT,

  CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Appointment"
  ADD COLUMN "serviceId" TEXT NOT NULL,
  ADD COLUMN "serviceName" TEXT,
  ADD COLUMN "servicePriceCents" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "PatientProfile_patientCode_key" ON "PatientProfile"("patientCode");

-- CreateIndex
CREATE UNIQUE INDEX "Service_name_key" ON "Service"("name");

-- CreateIndex
CREATE INDEX "Service_active_idx" ON "Service"("active");

-- CreateIndex
CREATE INDEX "Service_specialtyId_idx" ON "Service"("specialtyId");

-- CreateIndex
CREATE INDEX "Appointment_serviceId_idx" ON "Appointment"("serviceId");

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
