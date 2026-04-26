// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/admin/audit/access-logs/route";
import { logApiError } from "@/app/api/_utils/observability";
import { requireRole, requireSession } from "@/lib/authz";
import { getPrismaClient } from "@/lib/prisma";

vi.mock("@/lib/authz", () => ({
  requireSession: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: vi.fn(),
}));

vi.mock("@/app/api/_utils/observability", () => ({
  logApiError: vi.fn(),
}));

describe("GET /api/admin/audit/access-logs", () => {
  const findManyMock = vi.fn();
  const countMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    const prismaMock = {
      accessLog: {
        findMany: findManyMock,
        count: countMock,
      },
    };
    vi.mocked(getPrismaClient).mockReturnValue(prismaMock as unknown as ReturnType<typeof getPrismaClient>);
  });

  it("responde 400 cuando el filtro from no es una fecha válida", async () => {
    vi.mocked(requireSession).mockResolvedValueOnce({
      user: { id: "admin-1", role: "ADMINISTRADOR" },
    } as Awaited<ReturnType<typeof requireSession>>);
    vi.mocked(requireRole).mockReturnValueOnce(null);

    const response = await GET(new Request("http://localhost/api/admin/audit/access-logs?from=not-a-date"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Filtro de fechas inválido." });
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("responde 500 y registra observabilidad cuando Prisma falla", async () => {
    vi.mocked(requireSession).mockResolvedValueOnce({
      user: { id: "admin-1", role: "ADMINISTRADOR" },
    } as Awaited<ReturnType<typeof requireSession>>);
    vi.mocked(requireRole).mockReturnValueOnce(null);
    findManyMock.mockRejectedValueOnce(new Error("db down"));

    const response = await GET(new Request("http://localhost/api/admin/audit/access-logs"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "No se pudieron cargar los logs de acceso." });
    expect(logApiError).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "admin.access_logs.list_failed",
        route: "/api/admin/audit/access-logs",
        userId: "admin-1",
      }),
      expect.any(Error),
    );
  });

  it("devuelve resultados paginados cuando el usuario está autorizado", async () => {
    vi.mocked(requireSession).mockResolvedValueOnce({
      user: { id: "admin-1", role: "ADMINISTRADOR" },
    } as Awaited<ReturnType<typeof requireSession>>);
    vi.mocked(requireRole).mockReturnValueOnce(null);
    findManyMock.mockResolvedValueOnce([
      {
        id: "log-1",
        action: "read",
        route: "/api/patients/1",
        requestId: "req-1",
        createdAt: new Date("2026-04-20T10:00:00.000Z"),
        userId: "u-1",
        user: { name: "Ana", lastName: "Pérez", role: "ADMINISTRADOR" },
        patientId: "p-1",
        patient: { user: { name: "Carlos", lastName: "López" } },
        metadata: { source: "test" },
      },
    ]);
    countMock.mockResolvedValueOnce(1);

    const response = await GET(new Request("http://localhost/api/admin/audit/access-logs?page=1&pageSize=10"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([
      expect.objectContaining({
        id: "log-1",
        user: expect.objectContaining({ id: "u-1", role: "ADMINISTRADOR" }),
      }),
    ]);
    expect(body.total).toBe(1);
  });
});
