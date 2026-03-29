import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as schedulingPost } from "@/app/api/admin/scheduling/route";

const mockRequireSession = vi.fn();
const mockRequireRole = vi.fn();
const mockRefreshFutureInventoryForProfessional = vi.fn();

const mockPrisma = {
  professionalProfile: {
    findUnique: vi.fn(),
  },
  service: {
    findUnique: vi.fn(),
  },
  professionalService: {
    create: vi.fn(),
  },
  professionalWorkingSchedule: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  professionalScheduleAdjustment: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  professionalUnavailability: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("@/lib/authz", () => ({
  requireSession: () => mockRequireSession(),
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => mockPrisma,
}));

vi.mock("@/lib/scheduling/slot-inventory", () => ({
  refreshFutureInventoryForProfessional: (...args: unknown[]) => mockRefreshFutureInventoryForProfessional(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({ user: { id: "admin-id", role: "ADMINISTRADOR" } });
  mockRequireRole.mockReturnValue(null);
  mockPrisma.professionalProfile.findUnique.mockResolvedValue({
    id: "prof-1",
    active: true,
    user: { role: "PROFESIONAL" },
  });
  mockPrisma.service.findUnique.mockResolvedValue({ id: "service-1" });
  mockPrisma.professionalService.create.mockResolvedValue({ id: "assign-1" });
  mockPrisma.professionalWorkingSchedule.findMany.mockResolvedValue([]);
  mockPrisma.professionalWorkingSchedule.create.mockResolvedValue({ id: "schedule-1" });
  mockPrisma.professionalScheduleAdjustment.findUnique.mockResolvedValue({ id: "adj-1", professionalId: "prof-1" });
  mockPrisma.professionalScheduleAdjustment.update.mockResolvedValue({ id: "adj-1", status: "CONFIRMED" });
  mockPrisma.professionalUnavailability.findUnique.mockResolvedValue({ id: "ua-1", professionalId: "prof-1" });
  mockPrisma.professionalUnavailability.update.mockResolvedValue({ id: "ua-1", status: "APPROVED" });
  mockRefreshFutureInventoryForProfessional.mockResolvedValue({ removed: 0, created: 0, skipped: false });
});

describe("admin scheduling API", () => {
  it("creates a valid professional-service assignment", async () => {
    const response = await schedulingPost(
      new Request("http://localhost/api/admin/scheduling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "createAssignment",
          professionalId: "11111111-1111-4111-8111-111111111111",
          serviceId: "22222222-2222-4222-8222-222222222222",
          onlineBookable: true,
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(mockPrisma.professionalService.create).toHaveBeenCalledTimes(1);
    expect(mockRefreshFutureInventoryForProfessional).toHaveBeenCalledTimes(1);
  });

  it("rejects duplicated professional-service assignment", async () => {
    mockPrisma.professionalService.create.mockRejectedValueOnce({ code: "P2002" });

    const response = await schedulingPost(
      new Request("http://localhost/api/admin/scheduling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "createAssignment",
          professionalId: "11111111-1111-4111-8111-111111111111",
          serviceId: "22222222-2222-4222-8222-222222222222",
        }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain("ya existe");
  });

  it("rejects invalid professional-service combinations", async () => {
    mockPrisma.professionalProfile.findUnique.mockResolvedValueOnce(null);

    const response = await schedulingPost(
      new Request("http://localhost/api/admin/scheduling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "createAssignment",
          professionalId: "11111111-1111-4111-8111-111111111111",
          serviceId: "22222222-2222-4222-8222-222222222222",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mockPrisma.professionalService.create).not.toHaveBeenCalled();
  });

  it("creates a valid baseline schedule row", async () => {
    const response = await schedulingPost(
      new Request("http://localhost/api/admin/scheduling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "createSchedule",
          professionalId: "11111111-1111-4111-8111-111111111111",
          dayOfWeek: 1,
          startTime: "08:00",
          endTime: "12:00",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(mockPrisma.professionalWorkingSchedule.create).toHaveBeenCalledTimes(1);
    expect(mockRefreshFutureInventoryForProfessional).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid schedule rows", async () => {
    const response = await schedulingPost(
      new Request("http://localhost/api/admin/scheduling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "createSchedule",
          professionalId: "11111111-1111-4111-8111-111111111111",
          dayOfWeek: 3,
          startTime: "14:00",
          endTime: "14:00",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mockPrisma.professionalWorkingSchedule.create).not.toHaveBeenCalled();
  });

  it("allows admin to approve pending schedule adjustments", async () => {
    const response = await schedulingPost(
      new Request("http://localhost/api/admin/scheduling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "reviewAdjustment",
          adjustmentId: "33333333-3333-4333-8333-333333333333",
          action: "approve",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockPrisma.professionalScheduleAdjustment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "CONFIRMED" }) }),
    );
  });

  it("allows admin to approve pending unavailability", async () => {
    const response = await schedulingPost(
      new Request("http://localhost/api/admin/scheduling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "reviewUnavailability",
          entryId: "44444444-4444-4444-8444-444444444444",
          action: "approve",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockPrisma.professionalUnavailability.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "APPROVED" }) }),
    );
  });
});
