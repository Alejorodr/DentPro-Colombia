// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";

import { GET } from "@/app/api/client/dashboard/route";
import { requireSession } from "@/lib/authz";
import { getPrismaClient } from "@/lib/prisma";
import { getClientDashboardData } from "@/lib/portal/client-dashboard";

vi.mock("@/lib/authz", () => ({
  requireSession: vi.fn(),
  requireRole: vi.fn(() => null),
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: vi.fn(),
}));

vi.mock("@/lib/portal/client-dashboard", () => ({
  getClientDashboardData: vi.fn(),
}));

describe("GET /api/client/dashboard", () => {
  beforeEach(() => {
    vi.mocked(requireSession).mockReset();
    vi.mocked(getPrismaClient).mockReset();
    vi.mocked(getClientDashboardData).mockReset();
  });

  it("returns dashboard payload for patient", async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: "user-1", role: "PACIENTE" } });
    vi.mocked(getPrismaClient).mockReturnValue({} as any);
    vi.mocked(getClientDashboardData).mockResolvedValue({
      patient: { id: "patient-1", name: "Andrea Gomez", patientCode: "8930211", avatarUrl: null },
      insurance: { provider: "Colsanitas", status: "ACTIVE" },
      clinic: { name: "DentPro Portal", city: "Chía, Colombia", address: "Cra. 7 #13-180" },
      totalVisits: 2,
      nextAppointment: null,
      recentHistory: [],
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.totalVisits).toBe(2);
    expect(payload.patient.name).toBe("Andrea Gomez");
  });
});
