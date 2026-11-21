import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/receptionist/billing/route";

const mockRequireSession = vi.fn();
const mockRequireRole = vi.fn();

const mockPrisma = {
  appointment: {
    findMany: vi.fn(),
  },
};

vi.mock("@/lib/authz", () => ({
  requireSession: () => mockRequireSession(),
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => mockPrisma,
}));

describe("receptionist billing timezone boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({ user: { id: "user-1", role: "RECEPCIONISTA" } });
    mockRequireRole.mockReturnValue(null);
    mockPrisma.appointment.findMany.mockResolvedValue([]);
  });

  it("queries appointments strictly bounded by America/Bogota (UTC-5) calendar day", async () => {
    const request = new Request("http://localhost/api/receptionist/billing?date=2026-10-15");
    const response = await GET(request);
    expect(response.status).toBe(200);

    expect(mockPrisma.appointment.findMany).toHaveBeenCalledTimes(1);
    const callArgs = mockPrisma.appointment.findMany.mock.calls[0][0];
    const { startAt } = callArgs.where.timeSlot;

    // In America/Bogota (UTC-5), 2026-10-15 begins at 05:00:00.000Z and ends at 2026-10-16T04:59:59.999Z
    expect(startAt.gte.toISOString()).toBe("2026-10-15T05:00:00.000Z");
    expect(startAt.lte.toISOString()).toBe("2026-10-16T04:59:59.999Z");
  });
});
