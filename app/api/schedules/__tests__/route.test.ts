import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireSession = vi.fn();
const mockFindMany = vi.fn();

vi.mock("@/lib/authz", () => ({ requireSession: () => mockRequireSession() }));
vi.mock("@/lib/prisma", () => ({ getPrismaClient: () => ({ timeSlot: { findMany: mockFindMany } }) }));

describe("GET /api/schedules", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects anonymous schedule enumeration", async () => {
    mockRequireSession.mockResolvedValue({ error: { status: 401, message: "No autorizado." } });
    const { GET } = await import("@/app/api/schedules/route");

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("keeps the schedule response available to authenticated users", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "user-1", role: "PACIENTE" } });
    mockFindMany.mockResolvedValue([
      { id: "slot-1", professionalId: "professional-1", startAt: new Date("2026-08-29T10:00:00Z"), endAt: new Date("2026-08-29T11:00:00Z"), status: "AVAILABLE", professional: { user: { name: "Ana", lastName: "Dent" } } },
    ]);
    const { GET } = await import("@/app/api/schedules/route");

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: "slot-1", specialistId: "professional-1", specialistName: "Ana Dent", start: "2026-08-29T10:00:00.000Z", end: "2026-08-29T11:00:00.000Z", available: true }]);
  });
});
