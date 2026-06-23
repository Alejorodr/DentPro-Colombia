import { randomUUID } from "node:crypto";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/users/route";

const { requireSessionMock, requireRoleMock, prismaMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  requireRoleMock: vi.fn(),
  prismaMock: {
    user: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/authz", () => ({
  requireSession: requireSessionMock,
  requireRole: requireRoleMock,
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => prismaMock,
}));

vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/app/api/_utils/observability", () => ({ logApiError: vi.fn() }));

const ADMIN_SESSION = { user: { id: "admin-id", role: "ADMINISTRADOR" as const } };

function makeUser(overrides: Partial<{
  id: string; name: string; lastName: string; email: string;
  role: string; active: boolean; passwordHash: string | null;
  accounts: { provider: string }[];
}> = {}) {
  return {
    id: randomUUID(),
    name: "Test",
    lastName: "User",
    email: `test-${randomUUID()}@example.com`,
    role: "PACIENTE",
    active: true,
    passwordHash: "hash",
    createdAt: new Date(),
    accounts: [],
    patient: null,
    professional: null,
    ...overrides,
  };
}

describe("GET /api/users", () => {
  beforeEach(() => {
    requireSessionMock.mockResolvedValue(ADMIN_SESSION);
    requireRoleMock.mockReturnValue(null);
    prismaMock.user.count.mockResolvedValue(0);
    prismaMock.user.findMany.mockResolvedValue([]);
  });

  it("returns 401 when not authenticated", async () => {
    requireSessionMock.mockResolvedValue({ error: { message: "No autorizado.", status: 401 } });
    const req = new Request("http://localhost/api/users");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 when not ADMINISTRADOR", async () => {
    requireSessionMock.mockResolvedValue({ user: { id: "u", role: "PACIENTE" } });
    requireRoleMock.mockReturnValue({ status: 403, message: "No autorizado." });
    const req = new Request("http://localhost/api/users");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("computes hasLocalPassword=true when passwordHash is non-null", async () => {
    const user = makeUser({ passwordHash: "bcrypt-hash", accounts: [] });
    prismaMock.user.findMany.mockResolvedValue([user]);
    prismaMock.user.count.mockResolvedValue(1);

    const res = await GET(new Request("http://localhost/api/users"));
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { hasLocalPassword: boolean }[] };
    expect(body.data[0].hasLocalPassword).toBe(true);
  });

  it("computes hasLocalPassword=false when passwordHash is null", async () => {
    const user = makeUser({ passwordHash: null, accounts: [{ provider: "google" }] });
    prismaMock.user.findMany.mockResolvedValue([user]);
    prismaMock.user.count.mockResolvedValue(1);

    const res = await GET(new Request("http://localhost/api/users"));
    const body = await res.json() as { data: { hasLocalPassword: boolean; _isGoogleUser: boolean }[] };
    expect(body.data[0].hasLocalPassword).toBe(false);
    expect(body.data[0]._isGoogleUser).toBe(true);
  });

  it("passes search param to prisma where clause", async () => {
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.user.count.mockResolvedValue(0);

    await GET(new Request("http://localhost/api/users?search=ana"));

    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
      }),
    );
  });

  it("passes role param to prisma where clause", async () => {
    await GET(new Request("http://localhost/api/users?role=PROFESIONAL"));
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ role: "PROFESIONAL" }) }),
    );
  });

  it("passes active=false param to prisma where clause", async () => {
    await GET(new Request("http://localhost/api/users?active=false"));
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ active: false }) }),
    );
  });

  it("does not include passwordHash in the response", async () => {
    prismaMock.user.findMany.mockResolvedValue([makeUser()]);
    prismaMock.user.count.mockResolvedValue(1);
    const res = await GET(new Request("http://localhost/api/users"));
    const body = await res.json() as { data: Record<string, unknown>[] };
    expect(body.data[0].passwordHash).toBeUndefined();
  });
});
