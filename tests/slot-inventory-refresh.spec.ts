import { describe, expect, it, vi } from "vitest";

import { refreshFutureInventoryForAllProfessionals } from "@/lib/scheduling/slot-inventory";

function makeIds(prefix: string, size: number) {
  return Array.from({ length: size }, (_, index) => ({ id: `${prefix}${String(index + 1).padStart(3, "0")}` }));
}

describe("refreshFutureInventoryForAllProfessionals", () => {
  it("paginates active professionals explicitly and processes all pages", async () => {
    const firstPage = makeIds("p", 200);
    const secondPage = makeIds("q", 55);

    const findMany = vi.fn()
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage)
      .mockResolvedValueOnce([]);
    const findUnique = vi.fn().mockImplementation(async ({ where }: { where: { id: string } }) => ({
      id: where.id,
      active: false,
      specialty: null,
    }));

    const result = await refreshFutureInventoryForAllProfessionals({
      rangeStart: new Date("2027-01-01T00:00:00.000Z"),
      rangeEnd: new Date("2027-01-08T00:00:00.000Z"),
      prisma: {
        professionalProfile: {
          findMany,
          findUnique,
        },
      } as any,
    });

    expect(findMany).toHaveBeenCalledTimes(3);
    expect(findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { active: true },
        take: 200,
        orderBy: { id: "asc" },
        select: { id: true },
      }),
    );
    expect(findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { active: true },
        take: 200,
        orderBy: { id: "asc" },
        select: { id: true },
        cursor: { id: "p200" },
        skip: 1,
      }),
    );
    expect(result).toEqual({ professionals: 255, removed: 0, created: 0 });
    expect(findUnique).toHaveBeenCalledTimes(255);
  });
});
