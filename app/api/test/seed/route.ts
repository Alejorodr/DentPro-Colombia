import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { AppointmentStatus, Prisma, ProfessionalScheduleStatus, Role, TimeSlotStatus } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { refreshFutureInventoryForProfessional } from "@/lib/scheduling/slot-inventory";
import { enforceOpsRateLimit, getOpsKey, isOpsIpAllowed, isValidOpsKey, respondUnauthorized } from "@/app/api/ops/_utils";

const E2E_SCHEMA_HINT = "Database schema not initialized for E2E runtime. Required tables not found.";

export async function POST(request: Request) {
  const nodeEnv = process.env.NODE_ENV ?? "unknown";
  const vercelEnv = process.env.VERCEL_ENV ?? null;
  const runE2EEnabled = process.env.RUN_E2E === "1";
  const isVercelRuntime = process.env.VERCEL === "1";

  if (isVercelRuntime) {
    logger.warn({ event: "test.seed.disabled", route: "/api/test/seed", nodeEnv, vercelEnv, reason: "vercel_runtime" });
    return NextResponse.json({ error: "Endpoint disabled by runtime configuration." }, { status: 403 });
  }

  if (!runE2EEnabled) {
    logger.warn({ event: "test.seed.disabled", route: "/api/test/seed", nodeEnv, vercelEnv, reason: "run_e2e_disabled" });
    return NextResponse.json({ error: "Endpoint disabled by runtime configuration." }, { status: 403 });
  }

  if (!isOpsIpAllowed(request)) {
    logger.warn({ event: "test.seed.disabled", route: "/api/test/seed", nodeEnv, vercelEnv, reason: "ip_not_allowed" });
    return respondUnauthorized();
  }

  const rateLimitResponse = await enforceOpsRateLimit(request);
  if (rateLimitResponse) {
    logger.warn({ event: "test.seed.disabled", route: "/api/test/seed", nodeEnv, vercelEnv, reason: "rate_limited" });
    return rateLimitResponse;
  }

  const opsKey = getOpsKey();
  const headerKey = request.headers.get("x-ops-key")?.trim();
  if (!isValidOpsKey(headerKey, opsKey)) {
    logger.warn({ event: "test.seed.disabled", route: "/api/test/seed", nodeEnv, vercelEnv, reason: "ops_key_mismatch" });
    return respondUnauthorized();
  }

  logger.info({ event: "test.seed.start", route: "/api/test/seed", nodeEnv, vercelEnv });
  await logAuditEvent({
    actor: { identifier: "ops-key" },
    action: "test.seed.executed",
    resourceType: "ops_route",
    resourceId: "/api/test/seed",
    status: "success",
    metadata: {
      phase: "attempt",
      nodeEnv,
      vercelEnv,
    },
  });

  try {
    const prisma = getPrismaClient();

    const specialty = await prisma.specialty.upsert({
      where: { name: "Odontología General" },
      update: { defaultSlotDurationMinutes: 30, active: true },
      create: { name: "Odontología General", defaultSlotDurationMinutes: 30, active: true },
    });

    const service = await prisma.service.upsert({
      where: { name: "Limpieza Dental" },
      update: {
        description: "Profilaxis y pulido dental.",
        priceCents: 80000,
        durationMinutes: 30,
        active: true,
        specialtyId: specialty.id,
      },
      create: {
        name: "Limpieza Dental",
        description: "Profilaxis y pulido dental.",
        priceCents: 80000,
        durationMinutes: 30,
        active: true,
        specialtyId: specialty.id,
      },
    });

    const admin = await prisma.user.upsert({
      where: { email: "admin@dentpro.test" },
      update: {
        name: "Admin",
        lastName: "DentPro",
        role: Role.ADMINISTRADOR,
      },
      create: {
        email: "admin@dentpro.test",
        name: "Admin",
        lastName: "DentPro",
        role: Role.ADMINISTRADOR,
        passwordHash: await bcrypt.hash("Test1234!", 10),
      },
    });

    const receptionist = await prisma.user.upsert({
      where: { email: "recepcion@dentpro.test" },
      update: { name: "Diana", lastName: "Mora", role: Role.RECEPCIONISTA },
      create: {
        email: "recepcion@dentpro.test",
        name: "Diana",
        lastName: "Mora",
        role: Role.RECEPCIONISTA,
        passwordHash: await bcrypt.hash("RecepDentPro!1", 10),
      },
    });

    const professionalUser = await prisma.user.upsert({
      where: { email: "pro1@dentpro.test" },
      update: { name: "Laura", lastName: "Rojas", role: Role.PROFESIONAL },
      create: {
        email: "pro1@dentpro.test",
        name: "Laura",
        lastName: "Rojas",
        role: Role.PROFESIONAL,
        passwordHash: await bcrypt.hash("DentProPro!1", 10),
      },
    });

    const professional = await prisma.professionalProfile.upsert({
      where: { userId: professionalUser.id },
      update: { specialtyId: specialty.id, slotDurationMinutes: 30, active: true },
      create: { userId: professionalUser.id, specialtyId: specialty.id, slotDurationMinutes: 30, active: true },
    });

    await prisma.professionalService.upsert({
      where: { professionalId_serviceId: { professionalId: professional.id, serviceId: service.id } },
      update: {
        active: true,
        onlineBookable: true,
        appointmentDurationMinutes: service.durationMinutes,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
      },
      create: {
        professionalId: professional.id,
        serviceId: service.id,
        active: true,
        onlineBookable: true,
        appointmentDurationMinutes: service.durationMinutes,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
        notes: "E2E baseline assignment",
      },
    });

    await Promise.all(
      [1, 2, 3, 4, 5].map((dayOfWeek) =>
        prisma.professionalWorkingSchedule.upsert({
          where: {
            professionalId_dayOfWeek_startTime_endTime_timezone: {
              professionalId: professional.id,
              dayOfWeek,
              startTime: "09:00",
              endTime: "17:00",
              timezone: "America/Bogota",
            },
          },
          update: {
            active: true,
            status: ProfessionalScheduleStatus.CONFIRMED,
            createdByUserId: admin.id,
            notes: "E2E baseline schedule",
          },
          create: {
            professionalId: professional.id,
            dayOfWeek,
            startTime: "09:00",
            endTime: "17:00",
            timezone: "America/Bogota",
            active: true,
            status: ProfessionalScheduleStatus.CONFIRMED,
            createdByUserId: admin.id,
            notes: "E2E baseline schedule",
          },
        }),
      ),
    );

    const patientUser = await prisma.user.upsert({
      where: { email: "paciente1@dentpro.test" },
      update: { name: "Julia", lastName: "Vargas", role: Role.PACIENTE },
      create: {
        email: "paciente1@dentpro.test",
        name: "Julia",
        lastName: "Vargas",
        role: Role.PACIENTE,
        passwordHash: await bcrypt.hash("DentProPac!1", 10),
      },
    });

    const patient = await prisma.patientProfile.upsert({
      where: { userId: patientUser.id },
      update: { phone: "3005550001", documentId: "CC10001", active: true },
      create: { userId: patientUser.id, phone: "3005550001", documentId: "CC10001", active: true },
    });

    const now = new Date();
    now.setHours(9, 0, 0, 0);
    const endAt = new Date(now.getTime() + 30 * 60_000);
    const timeSlot = await prisma.timeSlot.upsert({
      where: {
        professionalId_startAt_endAt: {
          professionalId: professional.id,
          startAt: now,
          endAt,
        },
      },
      update: { status: TimeSlotStatus.BOOKED },
      create: {
        professionalId: professional.id,
        startAt: now,
        endAt,
        status: TimeSlotStatus.BOOKED,
      },
    });

    await prisma.appointment.upsert({
      where: { timeSlotId: timeSlot.id },
      update: {
        patientId: patient.id,
        professionalId: professional.id,
        serviceId: service.id,
        serviceName: service.name,
        servicePriceCents: service.priceCents,
        reason: service.name,
        status: AppointmentStatus.CONFIRMED,
      },
      create: {
        patientId: patient.id,
        professionalId: professional.id,
        timeSlotId: timeSlot.id,
        serviceId: service.id,
        serviceName: service.name,
        servicePriceCents: service.priceCents,
        reason: service.name,
        status: AppointmentStatus.CONFIRMED,
      },
    });

    const rangeStart = new Date();
    rangeStart.setMinutes(0, 0, 0);
    const rangeEnd = new Date(rangeStart);
    rangeEnd.setDate(rangeEnd.getDate() + 14);
    await refreshFutureInventoryForProfessional({ professionalId: professional.id, rangeStart, rangeEnd, prisma });

    logger.info({ event: "test.seed.success", route: "/api/test/seed", status: 200 });
    await logAuditEvent({
      actor: { identifier: "ops-key" },
      action: "test.seed.executed",
      resourceType: "ops_route",
      resourceId: "/api/test/seed",
      status: "success",
      metadata: {
        phase: "completed",
      },
    });
    return NextResponse.json({
      ok: true,
      users: {
        ADMINISTRADOR: { id: admin.id, email: admin.email, role: admin.role },
        RECEPCIONISTA: { id: receptionist.id, email: receptionist.email, role: receptionist.role },
        PROFESIONAL: { id: professionalUser.id, email: professionalUser.email, role: professionalUser.role },
        PACIENTE: { id: patientUser.id, email: patientUser.email, role: patientUser.role },
      },
    });
  } catch (error) {
    await logAuditEvent({
      actor: { identifier: "ops-key" },
      action: "test.seed.executed",
      resourceType: "ops_route",
      resourceId: "/api/test/seed",
      status: "failure",
      metadata: {
        nodeEnv,
        vercelEnv,
      },
    });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      logger.error({ event: "test.seed.failed", route: "/api/test/seed", status: 500, errorCode: error.code, error });
      return NextResponse.json(
        {
          error: "Seed failed.",
          hint: E2E_SCHEMA_HINT,
        },
        { status: 500 },
      );
    }

    logger.error({ event: "test.seed.failed", route: "/api/test/seed", status: 500, error });
    return NextResponse.json({ error: "Seed failed." }, { status: 500 });
  }
}
