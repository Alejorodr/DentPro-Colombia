// @vitest-environment node
import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ getPrismaClient: vi.fn() }));

import { generateBackupCodes, isMfaPending, normalizeBackupCode } from "@/lib/auth/mfa";
import { enableMfa, MfaError, resetMfa, startMfaEnrollment, verifyMfaChallenge } from "@/lib/auth/mfa-service";
import { generateTotp, generateTotpSecret, totpStep } from "@/lib/auth/totp";
import { getPrismaClient } from "@/lib/prisma";

const NOW = 1_800_000_000_000;
const USER = { id: "u-1", email: "ana@dentpro.co" };

function makePrisma() {
  return {
    userMfa: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn((args: unknown) => args),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      deleteMany: vi.fn((args: unknown) => args),
    },
    mfaBackupCode: {
      deleteMany: vi.fn((args: unknown) => args),
      createMany: vi.fn((args: unknown) => args),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    user: { update: vi.fn((args: unknown) => args) },
    $transaction: vi.fn(async (ops: unknown[]) => ops),
  };
}

let prisma: ReturnType<typeof makePrisma>;

beforeEach(() => {
  prisma = makePrisma();
  vi.mocked(getPrismaClient).mockReturnValue(prisma as never);
});

describe("reglas de MFA (DOG-28)", () => {
  it("isMfaPending exige sesión verificada y MFA activo solo a admin y profesional", () => {
    expect(isMfaPending({ role: "ADMINISTRADOR", sessionVerified: true, mfaEnabled: true })).toBe(false);
    expect(isMfaPending({ role: "ADMINISTRADOR", sessionVerified: false, mfaEnabled: true })).toBe(true);
    expect(isMfaPending({ role: "PROFESIONAL", sessionVerified: true, mfaEnabled: false })).toBe(true);
    expect(isMfaPending({ role: "PACIENTE", sessionVerified: false, mfaEnabled: false })).toBe(false);
  });

  it("genera 10 códigos de respaldo distintos con formato XXXXX-XXXXX sin caracteres ambiguos", () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) expect(code).toMatch(/^[A-HJKMNP-Z2-9]{5}-[A-HJKMNP-Z2-9]{5}$/);
    expect(normalizeBackupCode(" abcde-fgh23 ")).toBe("ABCDEFGH23");
  });
});

describe("inscripción", () => {
  it("crea el secreto la primera vez y devuelve QR y URI", async () => {
    prisma.userMfa.findUnique.mockResolvedValue(null);
    const enrollment = await startMfaEnrollment(USER);
    expect(prisma.userMfa.create).toHaveBeenCalledWith({ data: { userId: USER.id, secret: enrollment.secret } });
    expect(enrollment.qrDataUrl.startsWith("data:image/png;base64,")).toBe(true);
    expect(enrollment.otpauthUri).toContain(encodeURIComponent(USER.email));
  });

  it("reutiliza el secreto pendiente al recargar", async () => {
    prisma.userMfa.findUnique.mockResolvedValue({ secret: "JBSWY3DPEHPK3PXP", enabledAt: null });
    const enrollment = await startMfaEnrollment(USER);
    expect(enrollment.secret).toBe("JBSWY3DPEHPK3PXP");
    expect(prisma.userMfa.create).not.toHaveBeenCalled();
  });

  it("no deja reinscribirse con el MFA ya activo", async () => {
    prisma.userMfa.findUnique.mockResolvedValue({ secret: "X", enabledAt: new Date() });
    await expect(startMfaEnrollment(USER)).rejects.toMatchObject({ code: "already_enabled" });
  });

  it("activa con un código válido y guarda solo hashes de los códigos de respaldo", async () => {
    const secret = generateTotpSecret();
    prisma.userMfa.findUnique.mockResolvedValue({ secret, enabledAt: null, lastUsedStep: null });

    const codes = await enableMfa(USER.id, generateTotp(secret, totpStep(NOW)), NOW);

    expect(codes).toHaveLength(10);
    const created = prisma.mfaBackupCode.createMany.mock.calls[0][0] as { data: Array<{ codeHash: string }> };
    expect(created.data).toHaveLength(10);
    expect(created.data.some((row) => codes.includes(row.codeHash))).toBe(false);
    expect(await bcrypt.compare(normalizeBackupCode(codes[0]), created.data[0].codeHash)).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: USER.id }, data: { mfaEnabled: true } });
  });

  it("rechaza un código inválido sin activar nada", async () => {
    prisma.userMfa.findUnique.mockResolvedValue({ secret: generateTotpSecret(), enabledAt: null, lastUsedStep: null });
    await expect(enableMfa(USER.id, "000000", NOW)).rejects.toBeInstanceOf(MfaError);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("verificación al iniciar sesión", () => {
  const secret = generateTotpSecret();

  it("acepta el código de la app y registra el paso usado", async () => {
    prisma.userMfa.findUnique.mockResolvedValue({ secret, enabledAt: new Date(), lastUsedStep: null, backupCodes: [] });
    const result = await verifyMfaChallenge(USER.id, generateTotp(secret, totpStep(NOW)), NOW);
    expect(result.method).toBe("totp");
    expect(prisma.userMfa.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { lastUsedStep: totpStep(NOW) } }),
    );
  });

  it("rechaza el código si otra petición ya lo usó (carrera)", async () => {
    prisma.userMfa.findUnique.mockResolvedValue({ secret, enabledAt: new Date(), lastUsedStep: null, backupCodes: [] });
    prisma.userMfa.updateMany.mockResolvedValue({ count: 0 });
    await expect(verifyMfaChallenge(USER.id, generateTotp(secret, totpStep(NOW)), NOW)).rejects.toMatchObject({ code: "invalid_code" });
  });

  it("acepta un código de respaldo una sola vez y lo marca usado", async () => {
    const codeHash = await bcrypt.hash("ABCDEFGH23", 4);
    prisma.userMfa.findUnique.mockResolvedValue({
      secret,
      enabledAt: new Date(),
      lastUsedStep: null,
      backupCodes: [{ id: "b-1", codeHash }],
    });

    const result = await verifyMfaChallenge(USER.id, "abcde-fgh23", NOW);

    expect(result).toEqual({ method: "backup_code", remainingBackupCodes: 0 });
    expect(prisma.mfaBackupCode.updateMany).toHaveBeenCalledWith({
      where: { id: "b-1", usedAt: null },
      data: { usedAt: new Date(NOW) },
    });
  });

  it("rechaza un código de respaldo que no coincide", async () => {
    prisma.userMfa.findUnique.mockResolvedValue({
      secret,
      enabledAt: new Date(),
      lastUsedStep: null,
      backupCodes: [{ id: "b-1", codeHash: await bcrypt.hash("ABCDEFGH23", 4) }],
    });
    await expect(verifyMfaChallenge(USER.id, "ZZZZZ-ZZZZZ", NOW)).rejects.toMatchObject({ code: "invalid_code" });
  });

  it("falla si el MFA no está activo", async () => {
    prisma.userMfa.findUnique.mockResolvedValue({ secret, enabledAt: null, backupCodes: [] });
    await expect(verifyMfaChallenge(USER.id, "123456", NOW)).rejects.toMatchObject({ code: "not_enabled" });
  });
});

describe("restablecimiento", () => {
  it("borra el secreto y apaga mfaEnabled en una transacción", async () => {
    await resetMfa(USER.id);
    expect(prisma.userMfa.deleteMany).toHaveBeenCalledWith({ where: { userId: USER.id } });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: USER.id }, data: { mfaEnabled: false } });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
