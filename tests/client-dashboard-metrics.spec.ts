import { describe, expect, it } from "vitest";
import { AppointmentStatus } from "@prisma/client";

import { computeClientDashboardMetrics, type DashboardAppointment } from "@/lib/portal/client-dashboard";

function buildAppointment(
  id: string,
  status: AppointmentStatus,
  startAt: string,
  endAt: string,
): DashboardAppointment {
  return {
    id,
    status,
    reason: "Consulta",
    timeSlot: { startAt: new Date(startAt), endAt: new Date(endAt) },
    service: null,
    serviceName: "Consulta",
    servicePriceCents: 80000,
    professional: { user: { name: "Laura", lastName: "Rojas" } },
  };
}

describe("computeClientDashboardMetrics", () => {
  it("calculates total visits, next appointment, and recent history", () => {
    const now = new Date("2024-10-01T15:00:00Z");
    const appointments = [
      buildAppointment("1", AppointmentStatus.COMPLETED, "2024-09-10T10:00:00Z", "2024-09-10T10:30:00Z"),
      buildAppointment("2", AppointmentStatus.CONFIRMED, "2024-10-05T10:00:00Z", "2024-10-05T10:30:00Z"),
      buildAppointment("3", AppointmentStatus.CONFIRMED, "2024-09-25T10:00:00Z", "2024-09-25T10:30:00Z"),
      buildAppointment("4", AppointmentStatus.CANCELLED, "2024-09-20T10:00:00Z", "2024-09-20T10:30:00Z"),
    ];

    const metrics = computeClientDashboardMetrics(appointments, now);

    expect(metrics.totalVisits).toBe(2);
    expect(metrics.nextAppointment?.id).toBe("2");
    expect(metrics.recentHistory.map((item) => item.id)).toEqual(["3", "1"]);
  });
});
