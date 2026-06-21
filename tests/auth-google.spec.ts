import { beforeEach, describe, expect, it, vi } from "vitest";

import * as users from "@/lib/auth/users";
import { authConfig } from "@/auth.config";

vi.mock("@/lib/audit", () => ({ logAuditEvent: vi.fn().mockResolvedValue(undefined) }));

describe("google signIn callback", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.GOOGLE_AUTO_CREATE_PATIENTS = "true";
  });

  it("rechaza correo no verificado", async () => {
    const signIn = authConfig.callbacks.signIn as (params: Record<string, any>) => Promise<boolean>;
    await expect(
      signIn({ account: { provider: "google" }, profile: { email: "paciente@test.com", email_verified: false } }),
    ).resolves.toBe(false);
  });

  it("permite usuario existente sin duplicar", async () => {
    vi.spyOn(users, "findUserByEmail").mockResolvedValue({
      id: "u1",
      name: "Admin",
      email: "admin@test.com",
      role: "ADMINISTRADOR",
      active: true,
      professionalId: null,
      patientId: null,
    });
    const signIn = authConfig.callbacks.signIn as (params: Record<string, any>) => Promise<boolean>;
    await expect(
      signIn({ account: { provider: "google" }, profile: { email: "admin@test.com", email_verified: true } }),
    ).resolves.toBe(true);
  });

  it("rechaza usuario nuevo cuando auto create está apagado", async () => {
    process.env.GOOGLE_AUTO_CREATE_PATIENTS = "false";
    vi.spyOn(users, "findUserByEmail").mockResolvedValue(null);

    const signIn = authConfig.callbacks.signIn as (params: Record<string, any>) => Promise<boolean>;
    await expect(
      signIn({ account: { provider: "google" }, profile: { email: "nuevo@test.com", email_verified: true } }),
    ).resolves.toBe(false);
  });
});
