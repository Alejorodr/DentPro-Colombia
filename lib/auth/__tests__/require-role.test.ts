import { describe, expect, it, vi } from "vitest";

const { authMock, redirectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn(() => { throw new Error("REDIRECT"); }),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/lib/auth/roles", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/roles")>();
  return actual;
});

describe("requireRole", () => {
  it("redirects to /portal/change-password when mustChangePassword is true", async () => {
    authMock.mockResolvedValue({
      user: { id: "u1", role: "ADMINISTRADOR", mustChangePassword: true },
    });

    const { requireRole } = await import("@/lib/auth/require-role");

    await expect(requireRole("ADMINISTRADOR")).rejects.toThrow("REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/portal/change-password");
  });

  it("does NOT redirect when mustChangePassword is false", async () => {
    authMock.mockResolvedValue({
      user: { id: "u1", role: "ADMINISTRADOR", mustChangePassword: false },
    });
    redirectMock.mockReset();

    const { requireRole } = await import("@/lib/auth/require-role");

    const result = await requireRole("ADMINISTRADOR");
    expect(result).toBeTruthy();
    expect(redirectMock).not.toHaveBeenCalledWith("/portal/change-password");
  });

  it("redirects to /auth/login when not authenticated", async () => {
    authMock.mockResolvedValue(null);

    const { requireRole } = await import("@/lib/auth/require-role");

    await expect(requireRole("ADMINISTRADOR")).rejects.toThrow("REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/auth/login");
  });
});
