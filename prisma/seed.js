#!/usr/bin/env node
const { randomUUID } = require("crypto");
const bcrypt = require("bcryptjs");
const { PrismaClient, AppointmentStatus, UserRole } = require("@prisma/client");

const prisma = new PrismaClient();

const defaultUsers = [
  { name: "Laura Gómez", email: "laura@dentpro.co", role: UserRole.patient },
  { name: "Dr. Santiago Herrera", email: "santiago@dentpro.co", role: UserRole.professional },
  { name: "Coordinación Chía", email: "recepcion@dentpro.co", role: UserRole.reception },
  { name: "Ana María Pérez", email: "admin@dentpro.co", role: UserRole.admin },
];

const defaultPatients = [
  { name: "Laura Gómez", email: "laura@dentpro.co", phone: "+57 310 456 7890" },
  { name: "Carlos Pardo", email: "carlos@dentpro.co", phone: "+57 301 987 6543" },
];

const defaultSchedules = [
  {
    specialistId: "u2",
    start: new Date("2024-08-21T09:00:00-05:00"),
    end: new Date("2024-08-21T09:45:00-05:00"),
    available: false,
  },
  {
    specialistId: "u2",
    start: new Date("2024-08-21T10:00:00-05:00"),
    end: new Date("2024-08-21T10:45:00-05:00"),
    available: true,
  },
];

async function main() {
  const defaultPassword = process.env.SEED_PASSWORD;

  if (!defaultPassword) {
    throw new Error(
      "SEED_PASSWORD no está definido. Configura una contraseña segura en las variables de entorno antes de ejecutar el seed."
    );
  }

  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const patientRecords = new Map();

  for (const user of defaultUsers) {
    await prisma.user.upsert({
      where: { email: user.email.toLowerCase() },
      update: {
        name: user.name,
        passwordHash,
        primaryRole: user.role,
      },
      create: {
        id: randomUUID(),
        name: user.name,
        email: user.email.toLowerCase(),
        passwordHash,
        primaryRole: user.role,
      },
    });
  }

  for (const patient of defaultPatients) {
    const record = await prisma.patient.upsert({
      where: { email: patient.email.toLowerCase() },
      update: {
        name: patient.name,
        phone: patient.phone,
      },
      create: {
        id: randomUUID(),
        name: patient.name,
        email: patient.email.toLowerCase(),
        phone: patient.phone,
      },
    });

    patientRecords.set(record.email, record);
  }

  for (const schedule of defaultSchedules) {
    await prisma.schedule.upsert({
      where: {
        specialistId_start_end: {
          specialistId: schedule.specialistId,
          start: schedule.start,
          end: schedule.end,
        },
      },
      update: {
        available: schedule.available,
      },
      create: {
        id: randomUUID(),
        ...schedule,
      },
    });
  }

  const laura = patientRecords.get("laura@dentpro.co");

  if (laura) {
    await prisma.appointment.upsert({
      where: { id: "a1" },
      update: {
        patientId: laura.id,
        status: AppointmentStatus.confirmed,
      },
      create: {
        id: "a1",
        patientId: laura.id,
        specialistId: "u2",
        service: "Ortodoncia",
        scheduledAt: new Date("2024-08-21T09:00:00-05:00"),
        status: AppointmentStatus.confirmed,
        notes: "Consulta inicial",
      },
    });
  }

  console.log(
    `Seed completado. Usuarios sincronizados (${defaultUsers.length}), pacientes (${defaultPatients.length}) y horarios (${defaultSchedules.length}).`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error("Error al ejecutar el seed:", error);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
