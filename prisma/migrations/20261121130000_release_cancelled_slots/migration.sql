-- Phase 4 P1 (plan-refuerzo-2026-11-20), F1: cancelling an appointment must release its slot.
--
-- Before: "Appointment"."timeSlotId" was fully UNIQUE, so a CANCELLED appointment kept the
-- slot reserved forever and any later booking of that slot failed with a unique violation.
-- After: uniqueness only applies to non-cancelled appointments (partial unique index), so a
-- slot keeps the history of its cancelled appointments but can be booked again.
-- Mirrors prisma/schema.prisma (previewFeatures = ["partialIndexes"]), so `migrate diff`
-- reports no drift once applied.

-- 1. Plain index for FK lookups / joins (the old unique index served this purpose).
CREATE INDEX "Appointment_timeSlotId_idx" ON "Appointment"("timeSlotId");

-- 2. At most one non-cancelled appointment per slot. Safe to create on existing data:
--    the previous full UNIQUE index guarantees there are no duplicates at all.
CREATE UNIQUE INDEX "Appointment_timeSlotId_active_key" ON "Appointment"("timeSlotId") WHERE (status <> 'CANCELLED');

-- 3. Drop the old full unique index.
DROP INDEX "Appointment_timeSlotId_key";

-- 4. Backfill: free future slots that are still marked BOOKED although every appointment on
--    them is CANCELLED (the legacy PATCH /api/appointments/[id]/status route cancelled
--    without releasing the slot). Slots with no appointment at all and BREAK slots are not
--    touched. Past slots are left as-is (they cannot be booked anyway).
UPDATE "TimeSlot" ts
SET "status" = 'AVAILABLE'
WHERE ts."status" = 'BOOKED'
  AND ts."startAt" > NOW()
  AND EXISTS (SELECT 1 FROM "Appointment" a WHERE a."timeSlotId" = ts."id")
  AND NOT EXISTS (
    SELECT 1 FROM "Appointment" a
    WHERE a."timeSlotId" = ts."id" AND a."status" <> 'CANCELLED'
  );
