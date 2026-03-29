import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "@/app/api/professional/availability/route";

const mockRequireSession = vi.fn();
const mockRequireRole = vi.fn();
const mockPrisma = {
  professionalProfile: { findUnique: vi.fn() },
  professionalWorkingSchedule: { findMany: vi.fn() },
  professionalScheduleAdjustment: { findMany: vi.fn() },
  professionalUnavailability: { findMany: vi.fn() },
};
const mockGetEffectiveAvailability = vi.fn();

vi.mock("@/lib/authz", () => ({
  requireSession: () => mockRequireSession(),
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => mockPrisma,
}));

vi.mock("@/lib/scheduling/effective-availability", () => ({
  getEffectiveAvailability: (...args: unknown[]) => mockGetEffectiveAvailability(...args),
}));

describe("professional legacy availability wrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({ user: { id: "user-1", role: "PROFESIONAL" } });
    mockRequireRole.mockReturnValue(null);
    mockPrisma.professionalProfile.findUnique.mockResolvedValue({ id: "prof-1" });
    mockPrisma.professionalWorkingSchedule.findMany.mockResolvedValue([]);
    mockPrisma.professionalScheduleAdjustment.findMany.mockResolvedValue([]);
    mockPrisma.professionalUnavailability.findMany.mockResolvedValue([]);
    mockGetEffectiveAvailability.mockResolvedValue({ slots: [] });
  });

  it("returns deprecated wrapper payload sourced from canonical scheduling models", async () => {
    const response = await GET(new Request("http://localhost/api/professional/availability?range=15"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.legacy?.deprecated).toBe(true);
    expect(mockGetEffectiveAvailability).toHaveBeenCalledTimes(1);
  });

  it("blocks legacy writes and points to canonical route", async () => {
    const response = await POST();
    expect(response.status).toBe(410);
  });
});
