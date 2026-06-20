import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => ({
    user: { findUnique: mockFindUnique },
  }),
}));

vi.mock("./roles", () => ({
  isUserRole: (r: string) =>
    ["PACIENTE", "PROFESIONAL", "RECEPCIONISTA", "ADMINISTRADOR"].includes(r),
}));

const { findUserByEmail, findUserById, authenticateUser } = await import("../users");

beforeEach(() => {
  vi.clearAllMocks();
});

const baseDbRow = {
  id: "uuid-1",
  name: "Ana",
  email: "ana@test.com",
  role: "PACIENTE",
  active: true,
  passwordChangedAt: null,
  mfaEnabled: false,
  professional: null,
  patient: null,
};

describe("findUserByEmail", () => {
  it("returns active=true when user is active", async () => {
    mockFindUnique.mockResolvedValue(baseDbRow);
    const result = await findUserByEmail("ana@test.com");
    expect(result?.active).toBe(true);
  });

  it("returns active=false when user is inactive", async () => {
    mockFindUnique.mockResolvedValue({ ...baseDbRow, active: false });
    const result = await findUserByEmail("ana@test.com");
    expect(result?.active).toBe(false);
  });

  it("returns null when user not found", async () => {
    mockFindUnique.mockResolvedValue(null);
    expect(await findUserByEmail("nobody@test.com")).toBeNull();
  });
});

describe("findUserById", () => {
  it("returns active field", async () => {
    mockFindUnique.mockResolvedValue(baseDbRow);
    const result = await findUserById("uuid-1");
    expect(result?.active).toBe(true);
  });
});

describe("authenticateUser", () => {
  it("returns null when passwordHash is missing", async () => {
    mockFindUnique.mockResolvedValue({ ...baseDbRow, passwordHash: null });
    expect(await authenticateUser("ana@test.com", "pass")).toBeNull();
  });
});
