-- Enforce simple baseline schedule invariants for admin-managed weekly hours
ALTER TABLE "ProfessionalWorkingSchedule"
  ADD CONSTRAINT "ProfessionalWorkingSchedule_dayOfWeek_check" CHECK ("dayOfWeek" BETWEEN 0 AND 6),
  ADD CONSTRAINT "ProfessionalWorkingSchedule_time_range_check" CHECK ("endTime" > "startTime");

CREATE UNIQUE INDEX "ProfessionalWorkingSchedule_professionalId_dayOfWeek_startTime_endTime_timezone_key"
ON "ProfessionalWorkingSchedule"("professionalId", "dayOfWeek", "startTime", "endTime", "timezone");
