// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/analytics/admin/route";
import { requireRole, requireSession } from "@/lib/authz";
import { getAdminKpis } from "@/lib/analytics/admin";

vi.mock("@/lib/authz", () => ({
  requireSession: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("@/lib/analytics/admin", () => ({
  getAdminAppointmentsSummary: vi.fn(),
  getAdminKpis: vi.fn(),
  getAdminRevenueTrend: vi.fn(),
  getAdminStaffOnDuty: vi.fn(),
  getAdminTrend: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: vi.fn(() => ({})),
  isDatabaseUnavailableError: vi.fn(() => false),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn() },
}));

vi.mock("@prisma/client", () => ({
  AppointmentStatus: {
    SCHEDULED: "SCHEDULED",
    CONFIRMED: "CONFIRMED",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
    NO_SHOW: "NO_SHOW",
  },
}));

describe("GET /api/analytics/admin authz", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 401 cuando no hay sesión", async () => {
    vi.mocked(requireSession).mockResolvedValueOnce({ error: { status: 401, message: "No autorizado." } });

    const response = await GET(new Request("http://localhost/api/analytics/admin"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "No autorizado." });
    expect(getAdminKpis).not.toHaveBeenCalled();
  });

  it("responde 403 cuando el rol no está autorizado", async () => {
    vi.mocked(requireSession).mockResolvedValueOnce({ user: { id: "user-1", role: "PACIENTE" } } as any);
    vi.mocked(requireRole).mockReturnValueOnce({ status: 403, message: "No autorizado." });

    const response = await GET(new Request("http://localhost/api/analytics/admin"));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "No autorizado." });
    expect(getAdminKpis).not.toHaveBeenCalled();
  });
});
