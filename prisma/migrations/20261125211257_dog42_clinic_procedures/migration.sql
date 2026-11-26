/*
  Warnings:

  - You are about to drop the column `cupsCode` on the `Service` table. All the data in the column will be lost.

  DOG-42: el campo único `Service.cupsCode` (DOG-34) se reemplaza por el catálogo de procedimientos
  CUPS (`ClinicProcedure`). Esa columna nunca llegó a producción: las dos migraciones salen en el
  mismo release, así que no hay datos que perder.

*/
-- AlterTable
ALTER TABLE "Service" DROP COLUMN "cupsCode";

-- CreateTable
CREATE TABLE "ClinicProcedure" (
    "id" TEXT NOT NULL,
    "cupsCode" TEXT NOT NULL,
    "serviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicProcedure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalProcedure" (
    "professionalId" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfessionalProcedure_pkey" PRIMARY KEY ("professionalId","procedureId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClinicProcedure_cupsCode_key" ON "ClinicProcedure"("cupsCode");

-- CreateIndex
CREATE INDEX "ClinicProcedure_serviceId_idx" ON "ClinicProcedure"("serviceId");

-- CreateIndex
CREATE INDEX "ProfessionalProcedure_procedureId_idx" ON "ProfessionalProcedure"("procedureId");

-- AddForeignKey
ALTER TABLE "ClinicProcedure" ADD CONSTRAINT "ClinicProcedure_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalProcedure" ADD CONSTRAINT "ProfessionalProcedure_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalProcedure" ADD CONSTRAINT "ProfessionalProcedure_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "ClinicProcedure"("id") ON DELETE CASCADE ON UPDATE CASCADE;
