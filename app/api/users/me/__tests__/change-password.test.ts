import { randomUUID } from "node:crypto";
import { describe, expect, it, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { POST } from "@/app/api/users/me/change-password/route";

const USER_ID = randomUUID();

const { requireSessionMock, prismaMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/authz", () => ({ requireSession: requireSessionMock }));
vi.mock("@/lib/prisma", () => ({ getPrismaClient: () => prismaMock }));

async function callPost(body: Record<string, string>) {
  return POST(
    new Request("http://localhost/api/users/me/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/users/me/change-password", () => {
  beforeEach(() => {
    requireSessionMock.mockResolvedValue({ user: { id: USER_ID, role: "PACIENTE" } });
  });

  it("returns 401 when not authenticated", async () => {
    requireSessionMock.mockResolvedValue({ error: { message: "No autorizado.", status: 401 } });
    const res = await callPost({ currentPassword: "a", newPassword: "b" });
    expect(res.status).toBe(401);
  });

  it("returns 400 when user has no local password (Google-only)", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ passwordHash: null });
    const res = await callPost({ currentPassword: "any", newPassword: "NewPass1!" });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/Google/);
  });

  it("returns 400 when current password is wrong", async () => {
    const hash = await bcrypt.hash("CorrectPass1!", 10);
    prismaMock.user.findUnique.mockResolvedValue({ passwordHash: hash });
    const res = await callPost({ currentPassword: "WrongPass1!", newPassword: "NewPass1!" });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/incorrecta/);
  });

  it("returns 400 when new password fails policy", async () => {
    const hash = await bcrypt.hash("CorrectPass1!", 10);
    prismaMock.user.findUnique.mockResolvedValue({ passwordHash: hash });
    const res = await callPost({ currentPassword: "CorrectPass1!", newPassword: "weak" });
    expect(res.status).toBe(400);
  });

  it("returns ok:true and clears mustChangePassword on success", async () => {
    const hash = await bcrypt.hash("CorrectPass1!", 10);
    prismaMock.user.findUnique.mockResolvedValue({ passwordHash: hash });
    prismaMock.user.update.mockResolvedValue({ id: USER_ID });

    const res = await callPost({ currentPassword: "CorrectPass1!", newPassword: "NewPass1!" });
    expect(res.status).toBe(200);

    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ mustChangePassword: false }),
      }),
    );
  });
});
