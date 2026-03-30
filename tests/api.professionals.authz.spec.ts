// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/professionals/route";
import { requireSession } from "@/lib/authz";
import { getPrismaClient } from "@/lib/prisma";

vi.mock("@/lib/authz", () => ({ requireSession: vi.fn(), requireRole: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ getPrismaClient: vi.fn() }));
vi.mock("@prisma/client", () => ({
  Prisma: { PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {} },
  Role: {},
}));

describe("GET /api/professionals", () => {
  const findMany = vi.fn();
  const count = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    const authz = await import("@/lib/authz");
    vi.mocked(authz.requireRole).mockImplementation((user, roles) => {
      const allowed = Array.isArray(roles) ? roles : [roles];
      return allowed.includes(user.role) ? null : { status: 403, message: "No autorizado." };
    });
    vi.mocked(getPrismaClient).mockReturnValue({
      professionalProfile: { findMany, count },
    } as any);
  });

  it("rejects PACIENTE access server-side", async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: "patient-1", role: "PACIENTE" } } as any);

    const response = await GET(new Request("http://localhost/api/professionals"));
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe("No autorizado.");
    expect(findMany).not.toHaveBeenCalled();
  });

  it("redacts passwordHash from nested user payloads", async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: "admin-1", role: "ADMINISTRADOR" } } as any);
    findMany.mockResolvedValue([
      {
        id: "prof-1",
        user: { id: "user-1", email: "pro@example.com", passwordHash: "secret-hash" },
        specialty: { id: "spec-1", name: "Ortodoncia" },
      },
    ]);
    count.mockResolvedValue(1);

    const response = await GET(new Request("http://localhost/api/professionals?pageSize=10"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.items[0].user.passwordHash).toBeUndefined();
    expect(payload.items[0].user.email).toBe("pro@example.com");
  });
});
