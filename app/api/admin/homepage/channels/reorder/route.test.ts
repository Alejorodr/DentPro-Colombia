import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

import { PATCH } from "@/app/api/admin/homepage/channels/reorder/route";

const { requireAdminMock, parseJsonMock, prismaMock, logAuditEventMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  parseJsonMock: vi.fn(),
  prismaMock: {
    homepageChannel: { findMany: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
  logAuditEventMock: vi.fn(),
}));

vi.mock("@/app/api/admin/homepage/_lib", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/app/api/_utils/validation", () => ({
  parseJson: parseJsonMock,
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => prismaMock,
}));

vi.mock("@/lib/audit", () => ({
  logAuditEvent: logAuditEventMock,
}));

describe("PATCH /api/admin/homepage/channels/reorder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminMock.mockResolvedValue({ ok: true, sessionUser: { id: "admin-1", role: "ADMINISTRADOR" } });
    parseJsonMock.mockResolvedValue({
      data: { orderedIds: ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"] },
      error: null,
    });
    prismaMock.homepageChannel.findMany.mockResolvedValue([
      { id: "11111111-1111-4111-8111-111111111111" },
      { id: "22222222-2222-4222-8222-222222222222" },
    ]);
    prismaMock.homepageChannel.update.mockImplementation(({ where, data }: { where: { id: string }; data: { sortOrder: number } }) => ({
      where,
      data,
    }));
    prismaMock.$transaction.mockResolvedValue([]);
    logAuditEventMock.mockResolvedValue(undefined);
  });

  it("retorna 401 cuando no hay autorización", async () => {
    requireAdminMock.mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ error: "No autorizado." }, { status: 401 }),
    });

    const response = await PATCH(new Request("http://localhost/api/admin/homepage/channels/reorder", { method: "PATCH" }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "No autorizado." });
    expect(parseJsonMock).not.toHaveBeenCalled();
  });

  it("retorna 403 cuando el usuario autenticado no es admin", async () => {
    requireAdminMock.mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ error: "No autorizado." }, { status: 403 }),
    });

    const response = await PATCH(new Request("http://localhost/api/admin/homepage/channels/reorder", { method: "PATCH" }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "No autorizado." });
    expect(parseJsonMock).not.toHaveBeenCalled();
  });

  it("rechaza listas con IDs duplicados", async () => {
    parseJsonMock.mockResolvedValueOnce({
      data: { orderedIds: ["11111111-1111-4111-8111-111111111111", "11111111-1111-4111-8111-111111111111"] },
      error: null,
    });

    const response = await PATCH(new Request("http://localhost/api/admin/homepage/channels/reorder", { method: "PATCH" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("duplicados");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rechaza cuando la cantidad de IDs no coincide con los canales", async () => {
    parseJsonMock.mockResolvedValueOnce({
      data: { orderedIds: ["11111111-1111-4111-8111-111111111111"] },
      error: null,
    });

    const response = await PATCH(new Request("http://localhost/api/admin/homepage/channels/reorder", { method: "PATCH" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("no coincide");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rechaza cuando el conjunto de IDs no coincide", async () => {
    parseJsonMock.mockResolvedValueOnce({
      data: { orderedIds: ["11111111-1111-4111-8111-111111111111", "33333333-3333-4333-8333-333333333333"] },
      error: null,
    });

    const response = await PATCH(new Request("http://localhost/api/admin/homepage/channels/reorder", { method: "PATCH" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("inválidos");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("aplica el reorder cuando la lista es válida", async () => {
    parseJsonMock.mockResolvedValueOnce({
      data: { orderedIds: ["22222222-2222-4222-8222-222222222222", "11111111-1111-4111-8111-111111111111"] },
      error: null,
    });

    const response = await PATCH(new Request("http://localhost/api/admin/homepage/channels/reorder", { method: "PATCH" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    const transactionInput = prismaMock.$transaction.mock.calls[0][0] as Array<{ where: { id: string }; data: { sortOrder: number } }>;
    expect(transactionInput).toEqual([
      { where: { id: "22222222-2222-4222-8222-222222222222" }, data: { sortOrder: 0 } },
      { where: { id: "11111111-1111-4111-8111-111111111111" }, data: { sortOrder: 1 } },
    ]);
    expect(logAuditEventMock).toHaveBeenCalledTimes(1);
  });
});
