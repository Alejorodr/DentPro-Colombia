import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/public/slots/route";

const mockPrisma = {
  timeSlot: { findMany: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => mockPrisma,
}));

describe("public slots teaser contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.timeSlot.findMany.mockResolvedValue([
      {
        startAt: new Date("2026-04-01T14:00:00.000Z"),
        professional: {
          user: { name: "Ana", lastName: "Díaz" },
          specialty: { name: "Ortodoncia" },
        },
      },
    ]);
  });

  it("returns teaser contract without slot identifiers", async () => {
    const response = await GET(new Request("http://localhost/api/public/slots?limit=2"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.contract).toBe("teaser");
    expect(body.slots[0].id).toBeUndefined();
    expect(body.slots[0].startsAt).toBeTruthy();
  });
});
