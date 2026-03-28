-- CreateEnum
CREATE TYPE "ProfessionalScheduleStatus" AS ENUM ('PENDING_CONFIRMATION', 'CONFIRMED', 'CHANGES_REQUESTED');

-- CreateEnum
CREATE TYPE "UnavailabilityType" AS ENUM ('VACATION', 'SICK_LEAVE', 'TRAINING', 'ADMIN_TIME', 'PERSONAL_LEAVE', 'INTERNAL_BLOCK', 'OTHER');

-- CreateEnum
CREATE TYPE "UnavailabilityStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ProfessionalService" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "onlineBookable" BOOLEAN NOT NULL DEFAULT true,
    "appointmentDurationMinutes" INTEGER,
    "bufferBeforeMinutes" INTEGER,
    "bufferAfterMinutes" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalWorkingSchedule" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Bogota',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "status" "ProfessionalScheduleStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    "createdByUserId" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalWorkingSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalScheduleAdjustment" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "dayOfWeek" INTEGER,
    "startTime" TEXT,
    "endTime" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'America/Bogota',
    "status" "ProfessionalScheduleStatus" NOT NULL DEFAULT 'CHANGES_REQUESTED',
    "requestedByUserId" UUID NOT NULL,
    "reviewedByUserId" UUID,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalScheduleAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalUnavailability" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "type" "UnavailabilityType" NOT NULL,
    "status" "UnavailabilityStatus" NOT NULL DEFAULT 'PENDING',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "fullDay" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "createdByUserId" UUID,
    "approvedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalUnavailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalService_professionalId_serviceId_key" ON "ProfessionalService"("professionalId", "serviceId");
CREATE INDEX "ProfessionalService_serviceId_active_idx" ON "ProfessionalService"("serviceId", "active");
CREATE INDEX "ProfessionalService_professionalId_active_idx" ON "ProfessionalService"("professionalId", "active");

CREATE INDEX "ProfessionalWorkingSchedule_professionalId_active_idx" ON "ProfessionalWorkingSchedule"("professionalId", "active");
CREATE INDEX "ProfessionalWorkingSchedule_dayOfWeek_active_idx" ON "ProfessionalWorkingSchedule"("dayOfWeek", "active");

CREATE INDEX "ProfessionalScheduleAdjustment_professionalId_status_idx" ON "ProfessionalScheduleAdjustment"("professionalId", "status");
CREATE INDEX "ProfessionalScheduleAdjustment_effectiveFrom_idx" ON "ProfessionalScheduleAdjustment"("effectiveFrom");

CREATE INDEX "ProfessionalUnavailability_professionalId_startsAt_idx" ON "ProfessionalUnavailability"("professionalId", "startsAt");
CREATE INDEX "ProfessionalUnavailability_type_status_idx" ON "ProfessionalUnavailability"("type", "status");

CREATE UNIQUE INDEX "TimeSlot_professionalId_startAt_endAt_key" ON "TimeSlot"("professionalId", "startAt", "endAt");

-- AddForeignKey
ALTER TABLE "ProfessionalService" ADD CONSTRAINT "ProfessionalService_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfessionalService" ADD CONSTRAINT "ProfessionalService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProfessionalWorkingSchedule" ADD CONSTRAINT "ProfessionalWorkingSchedule_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfessionalWorkingSchedule" ADD CONSTRAINT "ProfessionalWorkingSchedule_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProfessionalScheduleAdjustment" ADD CONSTRAINT "ProfessionalScheduleAdjustment_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfessionalScheduleAdjustment" ADD CONSTRAINT "ProfessionalScheduleAdjustment_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ProfessionalWorkingSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProfessionalScheduleAdjustment" ADD CONSTRAINT "ProfessionalScheduleAdjustment_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfessionalScheduleAdjustment" ADD CONSTRAINT "ProfessionalScheduleAdjustment_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProfessionalUnavailability" ADD CONSTRAINT "ProfessionalUnavailability_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfessionalUnavailability" ADD CONSTRAINT "ProfessionalUnavailability_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProfessionalUnavailability" ADD CONSTRAINT "ProfessionalUnavailability_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
