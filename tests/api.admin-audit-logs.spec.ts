// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/admin/audit-logs/route";
import { requireRole, requireSession } from "@/lib/authz";
import { getPrismaClient } from "@/lib/prisma";

vi.mock("@/lib/authz", () => ({
  requireSession: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: vi.fn(),
}));

describe("GET /api/admin/audit-logs", () => {
  const findManyMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPrismaClient).mockReturnValue({
      auditLog: {
        findMany: findManyMock,
      },
    } as any);
  });

  it("responde 401 cuando no hay sesión", async () => {
    vi.mocked(requireSession).mockResolvedValueOnce({ error: { status: 401, message: "No autorizado." } });

    const response = await GET(new Request("http://localhost/api/admin/audit-logs"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "No autorizado." });
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("responde 403 cuando el rol no está autorizado", async () => {
    vi.mocked(requireSession).mockResolvedValueOnce({ user: { id: "user-1", role: "PACIENTE" } } as any);
    vi.mocked(requireRole).mockReturnValueOnce({ status: 403, message: "No autorizado." });

    const response = await GET(new Request("http://localhost/api/admin/audit-logs"));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "No autorizado." });
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("lista logs ordenados y devuelve nextCursor cuando hay más resultados", async () => {
    vi.mocked(requireSession).mockResolvedValueOnce({ user: { id: "admin-1", role: "ADMINISTRADOR" } } as any);
    vi.mocked(requireRole).mockReturnValueOnce(null);

    findManyMock.mockResolvedValueOnce([
      {
        id: "c",
        createdAt: new Date("2026-04-25T10:00:00.000Z"),
        action: "campaign.updated",
        resourceType: "campaign",
        resourceId: "cmp-1",
        targetLabel: "Campaña abril",
        status: "success",
        actorUserId: "admin-1",
        actorRole: "ADMINISTRADOR",
        actorIdentifier: "admin@dentpro.test",
        metadata: { changedFields: ["title", "active"] },
      },
      {
        id: "b",
        createdAt: new Date("2026-04-24T10:00:00.000Z"),
        action: "homepage.settings.updated",
        resourceType: "homepage_settings",
        resourceId: "homepage-main",
        targetLabel: null,
        status: "failure",
        actorUserId: "admin-2",
        actorRole: "ADMINISTRADOR",
        actorIdentifier: "ops@dentpro.test",
        metadata: { reason: "timeout" },
      },
      {
        id: "a",
        createdAt: new Date("2026-04-23T10:00:00.000Z"),
        action: "dummy",
        resourceType: "dummy",
        resourceId: null,
        targetLabel: null,
        status: "success",
        actorUserId: null,
        actorRole: null,
        actorIdentifier: null,
        metadata: null,
      },
    ]);

    const response = await GET(new Request("http://localhost/api/admin/audit-logs?limit=2&status=failure"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "failure" }),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 3,
      }),
    );
    expect(body.items).toHaveLength(2);
    expect(body.items[0]).toEqual(
      expect.objectContaining({
        id: "c",
        action: "campaign.updated",
        metadataPreview: ["changedFields: 2 elementos"],
      }),
    );
    expect(body.nextCursor).toEqual(expect.any(String));
  });
});
