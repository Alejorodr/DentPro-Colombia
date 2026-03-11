-- P5: normalize appointment status and persist appointment events
CREATE TYPE "AppointmentStatus_new" AS ENUM ('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

ALTER TABLE "Appointment"
  ADD COLUMN "status_new" "AppointmentStatus_new";

UPDATE "Appointment"
SET "status_new" = CASE
  WHEN "status" = 'PENDING' THEN 'SCHEDULED'::"AppointmentStatus_new"
  WHEN "status" = 'CONFIRMED' AND "checkedInAt" IS NOT NULL THEN 'CHECKED_IN'::"AppointmentStatus_new"
  WHEN "status" = 'CONFIRMED' THEN 'CONFIRMED'::"AppointmentStatus_new"
  WHEN "status" = 'COMPLETED' THEN 'COMPLETED'::"AppointmentStatus_new"
  WHEN "status" = 'CANCELLED' AND COALESCE("notes", '') ILIKE '%[NO_SHOW]%' THEN 'NO_SHOW'::"AppointmentStatus_new"
  WHEN "status" = 'CANCELLED' THEN 'CANCELLED'::"AppointmentStatus_new"
  ELSE 'SCHEDULED'::"AppointmentStatus_new"
END;

UPDATE "Appointment"
SET "notes" = NULLIF(TRIM(REPLACE(COALESCE("notes", ''), '[NO_SHOW]', '')), '')
WHERE COALESCE("notes", '') ILIKE '%[NO_SHOW]%';

ALTER TABLE "Appointment" DROP COLUMN "status";
ALTER TABLE "Appointment" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "Appointment" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "Appointment" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED'::"AppointmentStatus_new";

DROP TYPE "AppointmentStatus";
ALTER TYPE "AppointmentStatus_new" RENAME TO "AppointmentStatus";

CREATE TABLE "AppointmentEvent" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "actorUserId" UUID,
  "actorRole" "Role",
  "action" TEXT NOT NULL,
  "previousStatus" "AppointmentStatus",
  "newStatus" "AppointmentStatus",
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppointmentEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AppointmentEvent_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AppointmentEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");
CREATE INDEX "AppointmentEvent_appointmentId_createdAt_idx" ON "AppointmentEvent"("appointmentId", "createdAt");
CREATE INDEX "AppointmentEvent_actorUserId_idx" ON "AppointmentEvent"("actorUserId");
