import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

import type { AppointmentStatus } from "@/lib/api/types";
import type { UserRole } from "@/lib/auth/roles";

const prisma = new PrismaClient();
const ADMIN_ROLE: UserRole = "admin";
const PENDING_STATUS: AppointmentStatus = "pending";
const CONFIRMED_STATUS: AppointmentStatus = "confirmed";
const CANCELLED_STATUS: AppointmentStatus = "cancelled";

function todayAt(hours: number, minutes: number): Date {
  const now = new Date();
  now.setSeconds(0, 0);
  now.setHours(hours, minutes, 0, 0);
  return now;
}

async function main() {
  console.log("Seeding usuario admin...");
  const passwordHash = await bcrypt.hash("R00t&4ss", 10);

  await prisma.user.upsert({
    where: { email: "admin@dentpro.co" },
    update: {
      name: "Admin DentPro",
      passwordHash,
      primaryRole: ADMIN_ROLE,
    },
    create: {
      name: "Admin DentPro",
      email: "admin@dentpro.co",
      passwordHash,
      primaryRole: ADMIN_ROLE,
    },
  });

  console.log("Seeding especialistas...");
  const specialist1 = await prisma.specialist.upsert({
    where: { id: "spec-ortodoncia" },
    update: {
      name: "Dra. Ana Ortodoncia",
      specialty: "Ortodoncia",
      phone: "+57 300 111 2222",
    },
    create: {
      id: "spec-ortodoncia",
      name: "Dra. Ana Ortodoncia",
      specialty: "Ortodoncia",
      phone: "+57 300 111 2222",
    },
  });

  const specialist2 = await prisma.specialist.upsert({
    where: { id: "spec-rehab" },
    update: {
      name: "Dr. Carlos Rehabilitación",
      specialty: "Rehabilitación oral",
      phone: "+57 300 333 4444",
    },
    create: {
      id: "spec-rehab",
      name: "Dr. Carlos Rehabilitación",
      specialty: "Rehabilitación oral",
      phone: "+57 300 333 4444",
    },
  });

  console.log("Seeding pacientes...");
  const patient1 = await prisma.patient.upsert({
    where: { id: "patient-1" },
    update: {
      name: "Mariana López",
      email: "mariana@example.com",
      phone: "+57 300 555 6666",
    },
    create: {
      id: "patient-1",
      name: "Mariana López",
      email: "mariana@example.com",
      phone: "+57 300 555 6666",
    },
  });

  const patient2 = await prisma.patient.upsert({
    where: { id: "patient-2" },
    update: {
      name: "Juan Pérez",
      email: "juan@example.com",
      phone: "+57 300 777 8888",
    },
    create: {
      id: "patient-2",
      name: "Juan Pérez",
      email: "juan@example.com",
      phone: "+57 300 777 8888",
    },
  });

  console.log("Seeding horarios...");
  const schedule1 = await prisma.schedule.upsert({
    where: {
      specialistId_start_end: {
        specialistId: specialist1.id,
        start: todayAt(9, 0),
        end: todayAt(9, 30),
      },
    },
    update: { available: true },
    create: {
      specialistId: specialist1.id,
      start: todayAt(9, 0),
      end: todayAt(9, 30),
      available: true,
    },
  });

  const schedule2 = await prisma.schedule.upsert({
    where: {
      specialistId_start_end: {
        specialistId: specialist1.id,
        start: todayAt(10, 0),
        end: todayAt(10, 30),
      },
    },
    update: { available: true },
    create: {
      specialistId: specialist1.id,
      start: todayAt(10, 0),
      end: todayAt(10, 30),
      available: true,
    },
  });

  const schedule3 = await prisma.schedule.upsert({
    where: {
      specialistId_start_end: {
        specialistId: specialist2.id,
        start: todayAt(11, 0),
        end: todayAt(11, 30),
      },
    },
    update: { available: true },
    create: {
      specialistId: specialist2.id,
      start: todayAt(11, 0),
      end: todayAt(11, 30),
      available: true,
    },
  });

  console.log("Seeding citas...");
  await prisma.appointment.upsert({
    where: { id: "appointment-1" },
    update: {
      patientId: patient1.id,
      specialistId: specialist1.id,
      scheduleId: schedule1.id,
      service: "Ortodoncia",
      scheduledAt: schedule1.start,
      preferredDate: schedule1.start,
      status: PENDING_STATUS,
      notes: "Primera valoración ortodoncia.",
    },
    create: {
      id: "appointment-1",
      patientId: patient1.id,
      specialistId: specialist1.id,
      scheduleId: schedule1.id,
      service: "Ortodoncia",
      scheduledAt: schedule1.start,
      preferredDate: schedule1.start,
      status: PENDING_STATUS,
      notes: "Primera valoración ortodoncia.",
    },
  });

  await prisma.appointment.upsert({
    where: { id: "appointment-2" },
    update: {
      patientId: patient2.id,
      specialistId: specialist1.id,
      scheduleId: schedule2.id,
      service: "Limpieza",
      scheduledAt: schedule2.start,
      preferredDate: schedule2.start,
      status: CONFIRMED_STATUS,
      notes: "Control semestral.",
    },
    create: {
      id: "appointment-2",
      patientId: patient2.id,
      specialistId: specialist1.id,
      scheduleId: schedule2.id,
      service: "Limpieza",
      scheduledAt: schedule2.start,
      preferredDate: schedule2.start,
      status: CONFIRMED_STATUS,
      notes: "Control semestral.",
    },
  });

  await prisma.appointment.upsert({
    where: { id: "appointment-3" },
    update: {
      patientId: patient1.id,
      specialistId: specialist2.id,
      scheduleId: schedule3.id,
      service: "Rehabilitación oral",
      scheduledAt: schedule3.start,
      preferredDate: schedule3.start,
      status: CANCELLED_STATUS,
      notes: "Cancelada por el paciente.",
    },
    create: {
      id: "appointment-3",
      patientId: patient1.id,
      specialistId: specialist2.id,
      scheduleId: schedule3.id,
      service: "Rehabilitación oral",
      scheduledAt: schedule3.start,
      preferredDate: schedule3.start,
      status: CANCELLED_STATUS,
      notes: "Cancelada por el paciente.",
    },
  });

  console.log("Seed completado.");
}

main()
  .catch((error) => {
    console.error("Error durante el seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
