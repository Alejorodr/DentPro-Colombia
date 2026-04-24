// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/campaigns/route";
import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { getPrismaClient } from "@/lib/prisma";

vi.mock("@/app/api/_utils/auth", () => ({
  getSessionUser: vi.fn(),
  isAuthorized: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: vi.fn(),
}));

describe("GET /api/campaigns", () => {
  const findMany = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPrismaClient).mockReturnValue({ campaign: { findMany } } as any);
    findMany.mockResolvedValue([]);
  });

  it("limita por defecto a campañas activas y vigentes para usuarios públicos", async () => {
    vi.mocked(getSessionUser).mockResolvedValueOnce(null);

    const response = await GET(new Request("http://localhost/api/campaigns"));

    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          active: true,
          startAt: { lte: expect.any(Date) },
          endAt: { gte: expect.any(Date) },
        },
      }),
    );
  });

  it("mantiene filtro público cuando hay sesión no admin", async () => {
    vi.mocked(getSessionUser).mockResolvedValueOnce({ id: "user-1", role: "PACIENTE" } as any);
    vi.mocked(isAuthorized).mockReturnValueOnce(false);

    await GET(new Request("http://localhost/api/campaigns"));

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          active: true,
          startAt: { lte: expect.any(Date) },
          endAt: { gte: expect.any(Date) },
        },
      }),
    );
  });

  it("permite a admin solicitar campañas no públicas", async () => {
    vi.mocked(getSessionUser).mockResolvedValueOnce({ id: "admin-1", role: "ADMINISTRADOR" } as any);
    vi.mocked(isAuthorized).mockReturnValueOnce(true);

    await GET(new Request("http://localhost/api/campaigns"));

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it("si active=true, incluso admin recibe campañas activas y vigentes", async () => {
    vi.mocked(getSessionUser).mockResolvedValueOnce({ id: "admin-1", role: "ADMINISTRADOR" } as any);
    vi.mocked(isAuthorized).mockReturnValueOnce(true);

    await GET(new Request("http://localhost/api/campaigns?active=true"));

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          active: true,
          startAt: { lte: expect.any(Date) },
          endAt: { gte: expect.any(Date) },
        },
      }),
    );
  });
});
