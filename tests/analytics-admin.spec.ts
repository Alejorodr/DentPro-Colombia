// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AppointmentStatus, Role, TimeSlotStatus } from "@prisma/client";

import { getAdminKpis, getAdminTrend } from "@/lib/analytics/admin";
import { buildBucketStarts } from "@/lib/analytics/range";
import { getTestPrisma } from "@/tests/helpers/prisma-test";

describe("admin analytics", () => {
  const timeZone = "UTC";
  let prisma: Awaited<ReturnType<typeof getTestPrisma>>["prisma"];
  let reset: Awaited<ReturnType<typeof getTestPrisma>>["reset"];
  let disconnect: Awaited<ReturnType<typeof getTestPrisma>>["disconnect"];

  beforeAll(async () => {
    const testDb = await getTestPrisma();
    prisma = testDb.prisma;
    reset = testDb.reset;
    disconnect = testDb.disconnect;
  }, 20000);

  beforeEach(async () => {
    await reset();
  });

  afterAll(async () => {
    if (disconnect) {
      await disconnect();
    }
  });

  it("calculates KPIs from real data", async () => {
    const specialty = await prisma.specialty.create({
      data: { name: "General", defaultSlotDurationMinutes: 30, active: true },
    });

    const professionalUser = await prisma.user.create({
      data: {
        email: "pro@test.com",
        passwordHash: "hash",
        role: Role.PROFESIONAL,
        name: "Pro",
        lastName: "User",
      },
    });
    const professional = await prisma.professionalProfile.create({
      data: {
        userId: professionalUser.id,
        specialtyId: specialty.id,
        active: true,
      },
    });

    const service = await prisma.service.create({
      data: {
        name: "Consulta General",
        description: "Revisión general.",
        priceCents: 80000,
        active: true,
        specialtyId: specialty.id,
      },
    });

    const patientUser = await prisma.user.create({
      data: {
        email: "patient@test.com",
        passwordHash: "hash",
        role: Role.PACIENTE,
        name: "Paciente",
        lastName: "Uno",
        createdAt: new Date("2024-04-10T10:00:00Z"),
      },
    });
    const patient = await prisma.patientProfile.create({
      data: {
        userId: patientUser.id,
        phone: "3000000000",
      },
    });

    const bookedSlot = await prisma.timeSlot.create({
      data: {
        professionalId: professional.id,
        startAt: new Date("2024-04-10T14:00:00Z"),
        endAt: new Date("2024-04-10T14:30:00Z"),
        status: TimeSlotStatus.BOOKED,
      },
    });

    await prisma.appointment.create({
      data: {
        patientId: patient.id,
        professionalId: professional.id,
        timeSlotId: bookedSlot.id,
        serviceId: service.id,
        serviceName: service.name,
        servicePriceCents: service.priceCents,
        reason: "Consulta",
        status: AppointmentStatus.CONFIRMED,
      },
    });

    await prisma.timeSlot.create({
      data: {
        professionalId: professional.id,
        startAt: new Date("2024-04-11T14:00:00Z"),
        endAt: new Date("2024-04-11T14:30:00Z"),
        status: TimeSlotStatus.AVAILABLE,
      },
    });

    const kpis = await getAdminKpis(prisma, {
      from: new Date("2024-04-10T00:00:00Z"),
      to: new Date("2024-04-12T00:00:00Z"),
      useSql: false,
    });

    expect(kpis.totalAppointments).toBe(1);
    expect(kpis.statusCounts[AppointmentStatus.CONFIRMED]).toBe(1);
    expect(kpis.newPatients).toBe(1);
    expect(kpis.totalSlots).toBe(2);
    expect(kpis.bookedSlots).toBe(1);
    expect(kpis.utilizationRate).toBe(0.5);
    expect(kpis.activeProfessionals).toBe(1);
    expect(kpis.cancellations).toBe(0);
  });

  it("returns bucketed trends with zeros", async () => {
    const specialty = await prisma.specialty.create({
      data: { name: "General", defaultSlotDurationMinutes: 30, active: true },
    });

    const professionalUser = await prisma.user.create({
      data: {
        email: "pro2@test.com",
        passwordHash: "hash",
        role: Role.PROFESIONAL,
        name: "Pro",
        lastName: "User",
      },
    });
    const professional = await prisma.professionalProfile.create({
      data: {
        userId: professionalUser.id,
        specialtyId: specialty.id,
        active: true,
      },
    });

    const service = await prisma.service.create({
      data: {
        name: "Consulta Ortodoncia",
        description: "Primera evaluación.",
        priceCents: 120000,
        active: true,
        specialtyId: specialty.id,
      },
    });

    const patientUser = await prisma.user.create({
      data: {
        email: "patient2@test.com",
        passwordHash: "hash",
        role: Role.PACIENTE,
        name: "Paciente",
        lastName: "Dos",
      },
    });
    const patient = await prisma.patientProfile.create({
      data: { userId: patientUser.id },
    });

    const slot = await prisma.timeSlot.create({
      data: {
        professionalId: professional.id,
        startAt: new Date("2024-04-12T14:00:00Z"),
        endAt: new Date("2024-04-12T14:30:00Z"),
        status: TimeSlotStatus.BOOKED,
      },
    });

    await prisma.appointment.create({
      data: {
        patientId: patient.id,
        professionalId: professional.id,
        timeSlotId: slot.id,
        serviceId: service.id,
        serviceName: service.name,
        servicePriceCents: service.priceCents,
        reason: "Consulta",
        status: AppointmentStatus.PENDING,
      },
    });

    const from = new Date("2024-04-10T00:00:00Z");
    const to = new Date("2024-04-13T00:00:00Z");
    const trend = await getAdminTrend(prisma, { from, to, bucket: "day", timeZone, useSql: false });

    const bucketStarts = buildBucketStarts(from, to, "day", timeZone);
    expect(trend.series.length).toBe(bucketStarts.length);
    expect(trend.series).toEqual([0, 0, 1]);
  });
});
