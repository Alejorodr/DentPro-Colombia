import { randomUUID } from "node:crypto";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DELETE } from "@/app/api/users/[id]/route";

const { requireSessionMock, requireRoleMock, prismaMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  requireRoleMock: vi.fn(),
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/authz", () => ({
  requireSession: requireSessionMock,
  requireRole: requireRoleMock,
}));
vi.mock("@/lib/prisma", () => ({ getPrismaClient: () => prismaMock }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn() } }));

const ADMIN_SESSION = { user: { id: randomUUID(), role: "ADMINISTRADOR" as const } };

async function callDelete(targetId: string) {
  return DELETE(
    new Request(`http://localhost/api/users/${targetId}`, { method: "DELETE" }),
    { params: Promise.resolve({ id: targetId }) },
  );
}

describe("DELETE /api/users/[id] guard", () => {
  beforeEach(() => {
    requireSessionMock.mockResolvedValue(ADMIN_SESSION);
    requireRoleMock.mockReturnValue(null);
  });

  it("returns 404 when user not found", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const res = await callDelete(randomUUID());
    expect(res.status).toBe(404);
  });

  it("returns 400 when deleting the last active ADMINISTRADOR", async () => {
    const id = randomUUID();
    prismaMock.user.findUnique.mockResolvedValue({ id, role: "ADMINISTRADOR", active: true });
    prismaMock.user.count.mockResolvedValue(0);
    const res = await callDelete(id);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/único administrador/);
  });

  it("allows deleting an ADMINISTRADOR when others exist", async () => {
    const id = randomUUID();
    prismaMock.user.findUnique.mockResolvedValue({ id, role: "ADMINISTRADOR", active: true });
    prismaMock.user.count.mockResolvedValue(1);
    prismaMock.user.delete.mockResolvedValue({ id });
    const res = await callDelete(id);
    expect(res.status).toBe(200);
  });

  it("allows deleting a non-admin user", async () => {
    const id = randomUUID();
    prismaMock.user.findUnique.mockResolvedValue({ id, role: "PACIENTE", active: true });
    prismaMock.user.delete.mockResolvedValue({ id });
    const res = await callDelete(id);
    expect(res.status).toBe(200);
  });
});
