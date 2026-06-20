import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuthenticateUser = vi.fn();
const mockFindUserByEmail = vi.fn();
const mockLogger = { warn: vi.fn(), info: vi.fn() };

vi.mock("../users", () => ({
  authenticateUser: mockAuthenticateUser,
  findUserByEmail: mockFindUserByEmail,
}));
vi.mock("@/lib/logger", () => ({ logger: mockLogger }));
vi.mock("../roles", () => ({
  isUserRole: (r: string) =>
    ["PACIENTE", "PROFESIONAL", "RECEPCIONISTA", "ADMINISTRADOR"].includes(r),
  getDefaultDashboardPath: (role: string) => `/portal/${role.toLowerCase()}`,
}));

const { authorizeCredentials } = await import("../credentials");

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

const activeUser = {
  id: "uuid-1",
  name: "Ana",
  email: "ana@dentpro.test",
  role: "PACIENTE" as const,
  active: true,
  professionalId: null,
  patientId: null,
  passwordChangedAt: null,
};

describe("authorizeCredentials", () => {
  it("returns null when email is empty", async () => {
    expect(await authorizeCredentials({ email: "", password: "pass" })).toBeNull();
  });

  it("returns null when password is empty", async () => {
    expect(await authorizeCredentials({ email: "a@b.com", password: "" })).toBeNull();
  });

  it("returns null when authenticateUser returns null", async () => {
    mockAuthenticateUser.mockResolvedValue(null);
    expect(await authorizeCredentials({ email: "a@b.com", password: "pass" })).toBeNull();
  });

  it("returns null when user.active is false", async () => {
    mockAuthenticateUser.mockResolvedValue({ ...activeUser, active: false });
    const result = await authorizeCredentials({ email: "ana@dentpro.test", password: "pass" });
    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: "auth.credentials.account_inactive" }),
    );
  });

  it("returns user object when active and credentials valid", async () => {
    mockAuthenticateUser.mockResolvedValue(activeUser);
    const result = await authorizeCredentials({ email: "ana@dentpro.test", password: "pass" });
    expect(result).toMatchObject({ id: "uuid-1", role: "PACIENTE" });
    expect(result).not.toHaveProperty("passwordHash");
  });
});
