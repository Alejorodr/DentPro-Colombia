import { describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";

const findUniquePatient = vi.fn();
const findUniqueProfessional = vi.fn();
const findManyEvents = vi.fn();
const findManyNotifications = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => ({
    patientProfile: { findUnique: findUniquePatient },
    professionalProfile: { findUnique: findUniqueProfessional },
    appointmentEvent: { findMany: findManyEvents },
    notification: { findMany: findManyNotifications },
  }),
}));

describe("activity feed", () => {
  it("normaliza eventos y notificaciones", async () => {
    findUniquePatient.mockResolvedValue({ id: "patient-1" });
    findUniqueProfessional.mockResolvedValue(null);
    findManyEvents.mockResolvedValue([
      {
        id: "event-1",
        appointmentId: "appt-1",
        action: "status_updated",
        newStatus: "CONFIRMED",
        actorRole: "RECEPCIONISTA",
        actorUser: null,
        createdAt: new Date("2026-01-01T10:00:00.000Z"),
        metadata: null,
        appointment: {
          id: "appt-1",
          patient: { user: { name: "Ana", lastName: "Pérez" } },
        },
      },
    ]);
    findManyNotifications.mockResolvedValue([
      {
        id: "n-1",
        type: "appointment_rescheduled",
        title: "Cita reprogramada",
        body: "Tu cita fue reprogramada",
        entityType: "appointment",
        entityId: "appt-1",
        readAt: null,
        createdAt: new Date("2026-01-01T09:00:00.000Z"),
      },
    ]);

    const { getActivityFeed } = await import("@/lib/activity/feed");
    const feed = await getActivityFeed({ userId: "u-1", role: Role.PACIENTE, limit: 10 });

    expect(feed.events).toHaveLength(2);
    expect(feed.nextCursor).toBeNull();
    expect(feed.events[0]).toMatchObject({
      type: "appointment_status_changed",
      appointmentId: "appt-1",
      patientName: "Ana Pérez",
    });
    expect(feed.events[1]).toMatchObject({
      type: "notification_appointment_rescheduled",
      appointmentId: "appt-1",
    });
  });

  it("mantiene orden desc estable y no duplica ids", async () => {
    findUniquePatient.mockResolvedValue({ id: "patient-1" });
    findManyEvents.mockResolvedValue([
      {
        id: "evt-a",
        appointmentId: "appt-1",
        action: "created",
        newStatus: null,
        actorRole: "RECEPCIONISTA",
        actorUser: null,
        createdAt: new Date("2026-01-01T10:00:00.000Z"),
        metadata: null,
        appointment: { patient: { user: { name: "A", lastName: "B" } } },
      },
      {
        id: "evt-a",
        appointmentId: "appt-1",
        action: "created",
        newStatus: null,
        actorRole: "RECEPCIONISTA",
        actorUser: null,
        createdAt: new Date("2026-01-01T10:00:00.000Z"),
        metadata: null,
        appointment: { patient: { user: { name: "A", lastName: "B" } } },
      },
    ]);
    findManyNotifications.mockResolvedValue([
      {
        id: "n-1",
        type: "appointment_rescheduled",
        title: "N",
        body: null,
        entityType: "appointment",
        entityId: "appt-1",
        readAt: null,
        createdAt: new Date("2026-01-01T11:00:00.000Z"),
      },
    ]);

    const { getActivityFeed } = await import("@/lib/activity/feed");
    const feed = await getActivityFeed({ userId: "u-1", role: Role.PACIENTE, limit: 10 });

    expect(feed.events.map((item) => item.id)).toEqual(["notification_n-1", "event_evt-a"]);
  });

  it("genera nextCursor estable cuando hay más páginas", async () => {
    findUniquePatient.mockResolvedValue({ id: "patient-1" });
    findManyEvents.mockResolvedValue([
      {
        id: "evt-1",
        appointmentId: "appt-1",
        action: "created",
        actorRole: "RECEPCIONISTA",
        actorUser: null,
        createdAt: new Date("2026-01-01T10:00:00.000Z"),
        metadata: null,
        appointment: { patient: { user: { name: "A", lastName: "B" } } },
      },
      {
        id: "evt-2",
        appointmentId: "appt-1",
        action: "created",
        actorRole: "RECEPCIONISTA",
        actorUser: null,
        createdAt: new Date("2026-01-01T09:00:00.000Z"),
        metadata: null,
        appointment: { patient: { user: { name: "A", lastName: "B" } } },
      },
    ]);
    findManyNotifications.mockResolvedValue([]);

    const { getActivityFeed } = await import("@/lib/activity/feed");
    const feed = await getActivityFeed({ userId: "u-1", role: Role.PACIENTE, limit: 1 });

    expect(feed.events).toHaveLength(1);
    expect(feed.nextCursor).toBe("2026-01-01T10:00:00.000Z|event|evt-1");
  });

  it("aplica filtro por tipo exacto", async () => {
    findUniquePatient.mockResolvedValue({ id: "patient-1" });
    findManyEvents.mockResolvedValue([]);
    findManyNotifications.mockResolvedValue([
      {
        id: "n-2",
        type: "appointment_cancelled",
        title: "Cancelada",
        body: null,
        entityType: "appointment",
        entityId: "appt-1",
        readAt: null,
        createdAt: new Date("2026-01-01T09:00:00.000Z"),
      },
    ]);

    const { getActivityFeed } = await import("@/lib/activity/feed");
    const feed = await getActivityFeed({
      userId: "u-1",
      role: Role.PACIENTE,
      limit: 5,
      filters: { type: "notification_appointment_cancelled" },
    });

    expect(feed.events).toHaveLength(1);
    expect(feed.events[0]?.type).toBe("notification_appointment_cancelled");
  });
});
