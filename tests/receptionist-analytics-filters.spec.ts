import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppointmentStatus, TimeSlotStatus } from "@prisma/client";

import { GET as receptionistAnalyticsGet } from "@/app/api/analytics/receptionist/route";

const mockGetSessionUser = vi.fn();
const mockIsAuthorized = vi.fn();

const mockPrisma = {
  appointment: {
    count: vi.fn(),
    groupBy: vi.fn(),
    findMany: vi.fn(),
  },
  professionalProfile: {
    findMany: vi.fn(),
  },
};

vi.mock("@/app/api/_utils/auth", () => ({
  getSessionUser: () => mockGetSessionUser(),
  isAuthorized: (...args: unknown[]) => mockIsAuthorized(...args),
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => mockPrisma,
}));

describe("receptionist analytics filters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionUser.mockResolvedValue({ id: "r1", role: "RECEPCIONISTA" });
    mockIsAuthorized.mockReturnValue(true);
    mockPrisma.appointment.count.mockResolvedValue(1);
    mockPrisma.appointment.groupBy.mockResolvedValue([
      { status: AppointmentStatus.CONFIRMED, _count: { status: 1 } },
    ]);
    mockPrisma.appointment.findMany.mockResolvedValue([
      {
        id: "apt-1",
        status: AppointmentStatus.CONFIRMED,
        reason: "Control",
        timeSlot: { startAt: new Date("2026-04-28T09:00:00.000Z"), endAt: new Date("2026-04-28T10:00:00.000Z") },
        patient: { id: "pat-1", user: { name: "Ana", lastName: "Perez" } },
        professional: {
          id: "pro-1",
          user: { name: "Carlos", lastName: "Ruiz" },
          specialty: { name: "Ortodoncia" },
        },
        service: { id: "srv-1", name: "Control" },
      },
    ]);
    mockPrisma.professionalProfile.findMany.mockResolvedValue([
      {
        id: "pro-1",
        user: { name: "Carlos", lastName: "Ruiz" },
        specialty: { name: "Ortodoncia" },
        timeSlots: [
          {
            status: TimeSlotStatus.BOOKED,
            startAt: new Date("2026-04-28T09:00:00.000Z"),
            endAt: new Date("2026-04-28T10:00:00.000Z"),
          },
        ],
      },
    ]);
  });

  it("applies operational filters in Prisma where clause", async () => {
    const response = await receptionistAnalyticsGet(
      new Request("http://localhost/api/analytics/receptionist?from=2026-04-28&to=2026-04-28&professionalId=pro-1&specialty=Ortodoncia&status=NO_SHOW&patientQuery=ana"),
    );

    expect(response.status).toBe(200);
    expect(mockPrisma.appointment.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          professionalId: "pro-1",
          status: AppointmentStatus.NO_SHOW,
          professional: { specialty: { name: "Ortodoncia" } },
          patient: {
            user: {
              OR: expect.arrayContaining([
                { name: { contains: "ana", mode: "insensitive" } },
                { lastName: { contains: "ana", mode: "insensitive" } },
                { email: { contains: "ana", mode: "insensitive" } },
              ]),
            },
          },
        }),
      }),
    );
  });

  it("ignores unknown status filters", async () => {
    await receptionistAnalyticsGet(
      new Request("http://localhost/api/analytics/receptionist?from=2026-04-28&to=2026-04-28&status=invalid"),
    );

    const firstCallArg = mockPrisma.appointment.count.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(firstCallArg.where.status).toBeUndefined();
  });
});
