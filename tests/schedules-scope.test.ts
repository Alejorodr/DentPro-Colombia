import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSessionMock = vi.fn();
vi.mock("@/lib/authz", () => ({ requireSession: () => requireSessionMock() }));
const prismaMock = {
  timeSlot: { findMany: vi.fn() },
  professionalProfile: { findUnique: vi.fn() },
};
vi.mock("@/lib/prisma", () => ({ getPrismaClient: () => prismaMock }));

import { GET } from "@/app/api/schedules/route";

describe("GET /api/schedules scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.timeSlot.findMany.mockResolvedValue([]);
  });

  it("bounds the query to a future window with a row cap", async () => {
    requireSessionMock.mockResolvedValue({ user: { id: "u1", role: "RECEPCIONISTA" } });
    await GET();
    const args = prismaMock.timeSlot.findMany.mock.calls[0][0];
    expect(args.take).toBe(500);
    expect(args.where.startAt.gt.getTime()).toBeLessThanOrEqual(Date.now());
    const days = (args.where.startAt.lte.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29);
    expect(days).toBeLessThanOrEqual(30);
    expect(args.where.status).toBeUndefined();
  });

  it("shows patients only bookable AVAILABLE slots beyond the lead time", async () => {
    requireSessionMock.mockResolvedValue({ user: { id: "u1", role: "PACIENTE" } });
    await GET();
    const args = prismaMock.timeSlot.findMany.mock.calls[0][0];
    expect(args.where.status).toBe("AVAILABLE");
    expect(args.where.startAt.gt.getTime()).toBeGreaterThan(Date.now() + 119 * 60_000);
  });

  it("restricts professionals to their own agenda", async () => {
    requireSessionMock.mockResolvedValue({ user: { id: "u1", role: "PROFESIONAL" } });
    prismaMock.professionalProfile.findUnique.mockResolvedValue({ id: "pro-1" });
    await GET();
    expect(prismaMock.timeSlot.findMany.mock.calls[0][0].where.professionalId).toBe("pro-1");
  });

  it("returns 401 without a session", async () => {
    requireSessionMock.mockResolvedValue({ error: { message: "No autenticado.", status: 401 } });
    const res = await GET();
    expect(res.status).toBe(401);
    expect(prismaMock.timeSlot.findMany).not.toHaveBeenCalled();
  });
});
