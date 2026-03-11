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
    const items = await getActivityFeed({ userId: "u-1", role: Role.PACIENTE, limit: 10 });

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      type: "appointment_status_changed",
      appointmentId: "appt-1",
      patientName: "Ana Pérez",
    });
    expect(items[1]).toMatchObject({
      type: "notification_appointment_rescheduled",
      appointmentId: "appt-1",
    });
  });
});
