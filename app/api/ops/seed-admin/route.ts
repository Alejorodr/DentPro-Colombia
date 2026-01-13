import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { AppointmentStatus, Role, TimeSlotStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getPrismaClient } from "@/lib/prisma";
import {
  enforceRateLimit,
  getOpsKey,
  isOpsEnabled,
  respondGenericError,
  respondNotFound,
  respondUnauthorized,
} from "../_utils";

const GENERIC_SUCCESS_MESSAGE = "Operación completada.";

function requireSeedEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name} for OPS seed.`);
  }
  return value;
}

// TEMPORAL: endpoint de emergencia para crear/actualizar el admin.
export async function POST(request: Request) {
  if (!isOpsEnabled()) {
    return respondNotFound();
  }

  const rateLimitResponse = enforceRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const opsKey = getOpsKey();
  const headerKey = request.headers.get("x-ops-key")?.trim();
  if (!opsKey || !headerKey || headerKey !== opsKey) {
    return respondUnauthorized();
  }

  try {
    const adminEmail = requireSeedEnv("SEED_ADMIN_EMAIL").toLowerCase();
    const adminPassword = requireSeedEnv("SEED_ADMIN_PASSWORD");
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const prisma = getPrismaClient();
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

    const specialties = await Promise.all([
      prisma.specialty.upsert({
        where: { name: "Odontología General" },
        update: { defaultSlotDurationMinutes: 30, active: true },
        create: { name: "Odontología General", defaultSlotDurationMinutes: 30, active: true },
      }),
      prisma.specialty.upsert({
        where: { name: "Ortodoncia" },
        update: { defaultSlotDurationMinutes: 45, active: true },
        create: { name: "Ortodoncia", defaultSlotDurationMinutes: 45, active: true },
      }),
    ]);

    const users = [
      { email: adminEmail, role: Role.ADMINISTRADOR, name: "Admin", lastName: "DentPro", passwordHash },
      {
        email: "recepcion@dentpro.co",
        role: Role.RECEPCIONISTA,
        name: "Diana",
        lastName: "Mora",
        passwordHash: await bcrypt.hash("RecepDentPro!1", 12),
      },
      {
        email: "pro1@dentpro.co",
        role: Role.PROFESIONAL,
        name: "Laura",
        lastName: "Rojas",
        passwordHash: await bcrypt.hash("DentProPro!1", 12),
      },
      {
        email: "pro2@dentpro.co",
        role: Role.PROFESIONAL,
        name: "Luis",
        lastName: "Pardo",
        passwordHash: await bcrypt.hash("DentProPro!1", 12),
      },
      {
        email: "paciente1@dentpro.co",
        role: Role.PACIENTE,
        name: "Julia",
        lastName: "Vargas",
        passwordHash: await bcrypt.hash("DentProPac!1", 12),
      },
      {
        email: "paciente2@dentpro.co",
        role: Role.PACIENTE,
        name: "Samuel",
        lastName: "Torres",
        passwordHash: await bcrypt.hash("DentProPac!1", 12),
      },
      {
        email: "paciente3@dentpro.co",
        role: Role.PACIENTE,
        name: "Valentina",
        lastName: "Ruiz",
        passwordHash: await bcrypt.hash("DentProPac!1", 12),
      },
    ];

    const createdUsers = await Promise.all(
      users.map((user) =>
        prisma.user.upsert({
          where: { email: user.email },
          update: { name: user.name, lastName: user.lastName, role: user.role, passwordHash: user.passwordHash },
          create: user,
        }),
      ),
    );

    const professionalUsers = createdUsers.filter((user) => user.role === Role.PROFESIONAL);
    await Promise.all(
      professionalUsers.map((user, index) =>
        prisma.professionalProfile.upsert({
          where: { userId: user.id },
          update: {
            specialtyId: specialties[index % specialties.length].id,
            slotDurationMinutes: specialties[index % specialties.length].defaultSlotDurationMinutes,
            active: true,
          },
          create: {
            userId: user.id,
            specialtyId: specialties[index % specialties.length].id,
            slotDurationMinutes: specialties[index % specialties.length].defaultSlotDurationMinutes,
            active: true,
          },
        }),
      ),
    );

    const patientUsers = createdUsers.filter((user) => user.role === Role.PACIENTE);
    await Promise.all(
      patientUsers.map((user, index) =>
        prisma.patientProfile.upsert({
          where: { userId: user.id },
          update: {
            phone: `30055500${index}`,
            documentId: `CC10${index}2345`,
          },
          create: {
            userId: user.id,
            phone: `30055500${index}`,
            documentId: `CC10${index}2345`,
          },
        }),
      ),
    );

    const appointmentCount = await prisma.appointment.count();
    if (appointmentCount === 0) {
      const professionals = await prisma.professionalProfile.findMany({ orderBy: { userId: "asc" } });
      const patients = await prisma.patientProfile.findMany({ orderBy: { userId: "asc" } });

      const today = new Date();
      const buildSlot = (base: Date, hour: number, minute: number) => {
        const start = new Date(base);
        start.setHours(hour, minute, 0, 0);
        return start;
      };

      const slots = [
        { date: today, hour: 9, minute: 0, status: AppointmentStatus.PENDING },
        { date: today, hour: 11, minute: 0, status: AppointmentStatus.CONFIRMED },
        { date: new Date(today.getTime() + 2 * 24 * 60 * 60_000), hour: 10, minute: 0, status: AppointmentStatus.PENDING },
        { date: new Date(today.getTime() + 3 * 24 * 60 * 60_000), hour: 14, minute: 0, status: AppointmentStatus.CONFIRMED },
        { date: new Date(today.getTime() - 2 * 24 * 60 * 60_000), hour: 9, minute: 0, status: AppointmentStatus.COMPLETED },
        { date: new Date(today.getTime() - 3 * 24 * 60 * 60_000), hour: 16, minute: 0, status: AppointmentStatus.CANCELLED },
      ];

      await Promise.all(
        slots.map(async (slot, index) => {
          const professional = professionals[index % professionals.length];
          const patient = patients[index % patients.length];
          if (!professional || !patient) {
            return;
          }
          const duration = professional.slotDurationMinutes ?? specialties[0].defaultSlotDurationMinutes;
          const startAt = buildSlot(slot.date, slot.hour, slot.minute);
          const endAt = new Date(startAt.getTime() + duration * 60_000);

          const timeSlot = await prisma.timeSlot.create({
            data: {
              professionalId: professional.id,
              startAt,
              endAt,
              status: slot.status === AppointmentStatus.CANCELLED ? TimeSlotStatus.AVAILABLE : TimeSlotStatus.BOOKED,
            },
          });

          await prisma.appointment.create({
            data: {
              patientId: patient.id,
              professionalId: professional.id,
              timeSlotId: timeSlot.id,
              reason: index % 2 === 0 ? "Control odontológico" : "Consulta especializada",
              status: slot.status,
            },
          });
        }),
      );
    }

    const message = existingAdmin ? "Operación completada. Admin ya existe." : GENERIC_SUCCESS_MESSAGE;
    return NextResponse.json({ message }, { status: 200 });
  } catch (error) {
    console.error("OPS seed admin failed", error);
    return respondGenericError();
  }
}
