import { randomUUID } from "node:crypto";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/users/[id]/reset-password/route";

const { requireSessionMock, requireRoleMock, prismaMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  requireRoleMock: vi.fn(),
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/authz", () => ({
  requireSession: requireSessionMock,
  requireRole: requireRoleMock,
}));
vi.mock("@/lib/prisma", () => ({ getPrismaClient: () => prismaMock }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn() } }));

const ADMIN_SESSION = { user: { id: randomUUID(), role: "ADMINISTRADOR" as const } };

async function callPost(targetId: string) {
  return POST(
    new Request(`http://localhost/api/users/${targetId}/reset-password`, { method: "POST" }),
    { params: Promise.resolve({ id: targetId }) },
  );
}

describe("POST /api/users/[id]/reset-password", () => {
  beforeEach(() => {
    requireSessionMock.mockResolvedValue(ADMIN_SESSION);
    requireRoleMock.mockReturnValue(null);
  });

  it("returns 404 when user not found", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const res = await callPost(randomUUID());
    expect(res.status).toBe(404);
  });

  it("returns 400 when user has no local password (Google-only)", async () => {
    const id = randomUUID();
    prismaMock.user.findUnique.mockResolvedValue({ id, email: "g@test.com", passwordHash: null });
    const res = await callPost(id);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/contraseña local/);
  });

  it("returns the temp password and sets mustChangePassword=true", async () => {
    const id = randomUUID();
    prismaMock.user.findUnique.mockResolvedValue({ id, email: "local@test.com", passwordHash: "existing-hash" });
    prismaMock.user.update.mockResolvedValue({ id });

    const res = await callPost(id);
    expect(res.status).toBe(200);

    const body = await res.json() as { tempPassword: string };
    expect(typeof body.tempPassword).toBe("string");
    expect(body.tempPassword.length).toBeGreaterThan(10);

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id },
        data: expect.objectContaining({ mustChangePassword: true }),
      }),
    );
  });

  it("returns 403 when caller is not ADMINISTRADOR", async () => {
    requireRoleMock.mockReturnValue({ status: 403, message: "No autorizado." });
    const res = await callPost(randomUUID());
    expect(res.status).toBe(403);
  });
});
