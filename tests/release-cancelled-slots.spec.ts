// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AppointmentStatus, Role, TimeSlotStatus } from "@prisma/client";

import { getTestPrisma } from "@/tests/helpers/prisma-test";

/**
 * F1 (plan-refuerzo-2026-11-20, fase 4 P1): a cancelled appointment must not burn its slot.
 * Exercises the real partial unique index "Appointment_timeSlotId_active_key"
 * (unique on timeSlotId WHERE status <> 'CANCELLED') against the SQLite test database.
 */
describe("partial unique index on Appointment.timeSlotId", () => {
  let prisma: Awaited<ReturnType<typeof getTestPrisma>>["prisma"];
  let reset: Awaited<ReturnType<typeof getTestPrisma>>["reset"];
  let disconnect: Awaited<ReturnType<typeof getTestPrisma>>["disconnect"];

  beforeAll(async () => {
    const testDb = await getTestPrisma();
    prisma = testDb.prisma;
    reset = testDb.reset;
    disconnect = testDb.disconnect;
  }, 60000);

  beforeEach(async () => {
    await reset();
  });

  afterAll(async () => {
    if (disconnect) {
      await disconnect();
    }
  });

  async function seed() {
    const specialty = await prisma.specialty.create({
      data: { name: "General", defaultSlotDurationMinutes: 30, active: true },
    });
    const proUser = await prisma.user.create({
      data: { email: "pro@test.com", passwordHash: "hash", role: Role.PROFESIONAL, name: "Pro", lastName: "User" },
    });
    const professional = await prisma.professionalProfile.create({
      data: { userId: proUser.id, specialtyId: specialty.id, active: true },
    });
    const service = await prisma.service.create({
      data: { name: "Limpieza", priceCents: 80000, active: true, specialtyId: specialty.id },
    });
    const patients = await Promise.all(
      ["a", "b", "c"].map(async (key) => {
        const user = await prisma.user.create({
          data: { email: `pat-${key}@test.com`, passwordHash: "hash", role: Role.PACIENTE, name: key, lastName: "Paciente" },
        });
        return prisma.patientProfile.create({ data: { userId: user.id } });
      }),
    );
    const slot = await prisma.timeSlot.create({
      data: {
        professionalId: professional.id,
        startAt: new Date("2030-01-01T14:00:00Z"),
        endAt: new Date("2030-01-01T14:30:00Z"),
        status: TimeSlotStatus.BOOKED,
      },
    });
    return { professional, service, patients, slot };
  }

  function book(
    ctx: Awaited<ReturnType<typeof seed>>,
    patientIndex: number,
    status: AppointmentStatus = AppointmentStatus.SCHEDULED,
  ) {
    return prisma.appointment.create({
      data: {
        patientId: ctx.patients[patientIndex].id,
        professionalId: ctx.professional.id,
        timeSlotId: ctx.slot.id,
        serviceId: ctx.service.id,
        reason: "Control",
        status,
      },
    });
  }

  it("book → cancel → rebook succeeds and the cancelled appointment keeps its slot for history", async () => {
    const ctx = await seed();
    const first = await book(ctx, 0);

    // A second active appointment on the same slot is still rejected.
    await expect(book(ctx, 1)).rejects.toThrow();

    await prisma.appointment.update({ where: { id: first.id }, data: { status: AppointmentStatus.CANCELLED } });

    const rebooked = await book(ctx, 1);
    expect(rebooked.timeSlotId).toBe(ctx.slot.id);

    // Only one active appointment per slot, even after a rebook.
    await expect(book(ctx, 2)).rejects.toThrow();

    const history = await prisma.appointment.findMany({
      where: { timeSlotId: ctx.slot.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, status: true },
    });
    expect(history).toEqual([
      { id: first.id, status: AppointmentStatus.CANCELLED },
      { id: rebooked.id, status: AppointmentStatus.SCHEDULED },
    ]);
  });

  it("allows several cancelled appointments on the same slot", async () => {
    const ctx = await seed();
    await book(ctx, 0, AppointmentStatus.CANCELLED);
    await book(ctx, 1, AppointmentStatus.CANCELLED);
    await expect(book(ctx, 2)).resolves.toMatchObject({ status: AppointmentStatus.SCHEDULED });
  });

  it("does not let a cancelled appointment be reactivated onto a rebooked slot", async () => {
    const ctx = await seed();
    const first = await book(ctx, 0);
    await prisma.appointment.update({ where: { id: first.id }, data: { status: AppointmentStatus.CANCELLED } });
    await book(ctx, 1);

    await expect(
      prisma.appointment.update({ where: { id: first.id }, data: { status: AppointmentStatus.SCHEDULED } }),
    ).rejects.toThrow();
  });

  it("slot regeneration filter keeps slots that carry cancelled history", async () => {
    const ctx = await seed();
    await book(ctx, 0, AppointmentStatus.CANCELLED);
    const freeSlot = await prisma.timeSlot.create({
      data: {
        professionalId: ctx.professional.id,
        startAt: new Date("2030-01-01T15:00:00Z"),
        endAt: new Date("2030-01-01T15:30:00Z"),
        status: TimeSlotStatus.AVAILABLE,
      },
    });

    const deletable = await prisma.timeSlot.findMany({
      where: { professionalId: ctx.professional.id, appointments: { none: {} } },
      select: { id: true },
    });
    expect(deletable).toEqual([{ id: freeSlot.id }]);
  });
});
