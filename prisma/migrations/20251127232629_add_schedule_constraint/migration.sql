/*
  Warnings:

  - A unique constraint covering the columns `[specialistId,start,end]` on the table `schedules` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "schedules_specialistId_start_end_key" ON "schedules"("specialistId", "start", "end");
