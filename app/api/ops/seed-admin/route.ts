import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { AppointmentStatus, InsuranceStatus, Role, TimeSlotStatus } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";
import {
  enforceOpsRateLimit,
  getOpsKey,
  isOpsIpAllowed,
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
  if (process.env.NODE_ENV !== "development") {
    return respondNotFound();
  }

  if (!isOpsIpAllowed(request)) {
    return respondUnauthorized();
  }

  const rateLimitResponse = await enforceOpsRateLimit(request);
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
      prisma.specialty.upsert({
        where: { name: "Endodoncia" },
        update: { defaultSlotDurationMinutes: 60, active: true },
        create: { name: "Endodoncia", defaultSlotDurationMinutes: 60, active: true },
      }),
    ]);

    const services = await Promise.all([
      prisma.service.upsert({
        where: { name: "Limpieza Dental" },
        update: {
          description: "Profilaxis y pulido dental.",
          priceCents: 80000,
          durationMinutes: 30,
          active: true,
          specialtyId: specialties[0]?.id ?? null,
        },
        create: {
          name: "Limpieza Dental",
          description: "Profilaxis y pulido dental.",
          priceCents: 80000,
          durationMinutes: 30,
          active: true,
          specialtyId: specialties[0]?.id ?? null,
        },
      }),
      prisma.service.upsert({
        where: { name: "Blanqueamiento" },
        update: {
          description: "Tratamiento estético para aclarar el esmalte.",
          priceCents: 250000,
          durationMinutes: 60,
          active: true,
          specialtyId: specialties[0]?.id ?? null,
        },
        create: {
          name: "Blanqueamiento",
          description: "Tratamiento estético para aclarar el esmalte.",
          priceCents: 250000,
          durationMinutes: 60,
          active: true,
          specialtyId: specialties[0]?.id ?? null,
        },
      }),
      prisma.service.upsert({
        where: { name: "Endodoncia Básica" },
        update: {
          description: "Tratamiento de conductos para aliviar dolor.",
          priceCents: 180000,
          durationMinutes: 60,
          active: true,
          specialtyId: specialties[2]?.id ?? null,
        },
        create: {
          name: "Endodoncia Básica",
          description: "Tratamiento de conductos para aliviar dolor.",
          priceCents: 180000,
          durationMinutes: 60,
          active: true,
          specialtyId: specialties[2]?.id ?? null,
        },
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
      {
        email: "demo-paciente@dentpro.co",
        role: Role.PACIENTE,
        name: "Andrea",
        lastName: "Gomez",
        passwordHash: await bcrypt.hash("DentProDemo!1", 12),
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
            insuranceProvider: index % 2 === 0 ? "Colsanitas Dental Plan" : null,
            insuranceStatus: index % 2 === 0 ? InsuranceStatus.ACTIVE : InsuranceStatus.UNKNOWN,
            address: "Cra. 7 #13-180",
            city: "Chía, Cundinamarca",
            patientCode: `89302${index}1`,
            active: true,
          },
          create: {
            userId: user.id,
            phone: `30055500${index}`,
            documentId: `CC10${index}2345`,
            insuranceProvider: index % 2 === 0 ? "Colsanitas Dental Plan" : null,
            insuranceStatus: index % 2 === 0 ? InsuranceStatus.ACTIVE : InsuranceStatus.UNKNOWN,
            address: "Cra. 7 #13-180",
            city: "Chía, Cundinamarca",
            patientCode: `89302${index}1`,
            active: true,
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
          const service = services[index % services.length];
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
              serviceId: service.id,
              serviceName: service.name,
              servicePriceCents: service.priceCents,
              reason: service.name,
              status: slot.status,
            },
          });
        }),
      );
    }

    const demoPatient = await prisma.patientProfile.findFirst({
      where: { user: { email: "demo-paciente@dentpro.co" } },
    });
    const primaryProfessional = await prisma.professionalProfile.findFirst({ orderBy: { userId: "asc" } });

    if (demoPatient && primaryProfessional) {
      const demoAppointments = await prisma.appointment.count({ where: { patientId: demoPatient.id } });
      if (demoAppointments < 3) {
        const now = new Date();
        const buildSlot = (offsetDays: number, hour: number) => {
          const date = new Date(now);
          date.setDate(now.getDate() + offsetDays);
          date.setHours(hour, 0, 0, 0);
          return date;
        };

        const demoSlots = [
          { startAt: buildSlot(-7, 9), status: AppointmentStatus.COMPLETED },
          { startAt: buildSlot(-3, 11), status: AppointmentStatus.COMPLETED },
          { startAt: buildSlot(5, 10), status: AppointmentStatus.CONFIRMED },
        ];

        for (const slot of demoSlots) {
          const endAt = new Date(slot.startAt.getTime() + (primaryProfessional.slotDurationMinutes ?? 30) * 60_000);
          const timeSlot = await prisma.timeSlot.create({
            data: {
              professionalId: primaryProfessional.id,
              startAt: slot.startAt,
              endAt,
              status: slot.status === AppointmentStatus.CONFIRMED ? TimeSlotStatus.BOOKED : TimeSlotStatus.BOOKED,
            },
          });

          const service = services[0];

          await prisma.appointment.create({
            data: {
              patientId: demoPatient.id,
              professionalId: primaryProfessional.id,
              timeSlotId: timeSlot.id,
              serviceId: service.id,
              serviceName: service.name,
              servicePriceCents: service.priceCents,
              reason: service.name,
              status: slot.status,
            },
          });
        }
      }
    }

    if (primaryProfessional) {
      const availableCount = await prisma.timeSlot.count({
        where: { professionalId: primaryProfessional.id, status: TimeSlotStatus.AVAILABLE },
      });

      if (availableCount < 5) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 1);
        startDate.setHours(9, 0, 0, 0);

        const slots = Array.from({ length: 5 }, (_, index) => {
          const startAt = new Date(startDate.getTime() + index * 60 * 60_000);
          const endAt = new Date(startAt.getTime() + (primaryProfessional.slotDurationMinutes ?? 30) * 60_000);
          return { startAt, endAt };
        });

        await prisma.timeSlot.createMany({
          data: slots.map((slot) => ({
            professionalId: primaryProfessional.id,
            startAt: slot.startAt,
            endAt: slot.endAt,
            status: TimeSlotStatus.AVAILABLE,
          })),
          skipDuplicates: true,
        });
      }
    }

    const message = existingAdmin ? "Operación completada. Admin ya existe." : GENERIC_SUCCESS_MESSAGE;
    return NextResponse.json({ message }, { status: 200 });
  } catch (error) {
    console.error("OPS seed admin failed", error);
    return respondGenericError();
  }
}
