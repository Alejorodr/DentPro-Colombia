-- Drop unused appointmentId column from TimeSlot to align with 1:1 Appointment relation
ALTER TABLE "TimeSlot" DROP COLUMN "appointmentId";
