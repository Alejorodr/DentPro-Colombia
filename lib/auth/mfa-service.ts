import bcrypt from "bcryptjs";
import QRCode from "qrcode";

import {
  generateBackupCodes,
  looksLikeTotpCode,
  MFA_ISSUER,
  normalizeBackupCode,
} from "@/lib/auth/mfa";
import { buildOtpauthUri, generateTotpSecret, verifyTotp } from "@/lib/auth/totp";
import { getPrismaClient } from "@/lib/prisma";

/** Operaciones del segundo factor contra la base (DOG-28). */

const BACKUP_CODE_BCRYPT_ROUNDS = 10;

export class MfaError extends Error {
  constructor(
    message: string,
    readonly code: "already_enabled" | "not_started" | "not_enabled" | "invalid_code",
  ) {
    super(message);
  }
}

export type MfaEnrollment = { secret: string; otpauthUri: string; qrDataUrl: string };

/**
 * Empieza (o retoma) la inscripción: reutiliza el secreto pendiente para que recargar la página no
 * invalide un QR que la persona ya escaneó.
 */
export async function startMfaEnrollment(user: { id: string; email: string }): Promise<MfaEnrollment> {
  const prisma = getPrismaClient();
  const existing = await prisma.userMfa.findUnique({ where: { userId: user.id } });
  if (existing?.enabledAt) {
    throw new MfaError("La verificación en dos pasos ya está activa.", "already_enabled");
  }

  const secret = existing?.secret ?? generateTotpSecret();
  if (!existing) {
    await prisma.userMfa.create({ data: { userId: user.id, secret } });
  }

  const otpauthUri = buildOtpauthUri({ secret, accountName: user.email, issuer: MFA_ISSUER });
  const qrDataUrl = await QRCode.toDataURL(otpauthUri, { margin: 1, width: 220, errorCorrectionLevel: "M" });
  return { secret, otpauthUri, qrDataUrl };
}

/** Confirma la inscripción con un código de la app y devuelve los códigos de respaldo en claro (única vez). */
export async function enableMfa(userId: string, code: string, now = Date.now()): Promise<string[]> {
  const prisma = getPrismaClient();
  const mfa = await prisma.userMfa.findUnique({ where: { userId } });
  if (!mfa) throw new MfaError("Primero escanea el código QR.", "not_started");
  if (mfa.enabledAt) throw new MfaError("La verificación en dos pasos ya está activa.", "already_enabled");

  const step = verifyTotp(mfa.secret, code, { now, lastUsedStep: mfa.lastUsedStep });
  if (step === null) throw new MfaError("El código no es válido. Revisa la hora del celular e intenta de nuevo.", "invalid_code");

  const backupCodes = generateBackupCodes();
  const hashes = await Promise.all(backupCodes.map((item) => bcrypt.hash(normalizeBackupCode(item), BACKUP_CODE_BCRYPT_ROUNDS)));

  await prisma.$transaction([
    prisma.userMfa.update({ where: { userId }, data: { enabledAt: new Date(now), lastUsedStep: step } }),
    prisma.mfaBackupCode.deleteMany({ where: { userId } }),
    prisma.mfaBackupCode.createMany({ data: hashes.map((codeHash) => ({ userId, codeHash })) }),
    prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } }),
  ]);

  return backupCodes;
}

export type MfaChallengeResult = { method: "totp" | "backup_code"; remainingBackupCodes: number };

/** Verifica el segundo paso al iniciar sesión, con un código de la app o uno de respaldo. */
export async function verifyMfaChallenge(userId: string, code: string, now = Date.now()): Promise<MfaChallengeResult> {
  const prisma = getPrismaClient();
  const mfa = await prisma.userMfa.findUnique({
    where: { userId },
    include: { backupCodes: { where: { usedAt: null }, select: { id: true, codeHash: true } } },
  });
  if (!mfa?.enabledAt) throw new MfaError("La verificación en dos pasos no está activa.", "not_enabled");

  if (looksLikeTotpCode(code)) {
    const step = verifyTotp(mfa.secret, code, { now, lastUsedStep: mfa.lastUsedStep });
    if (step === null) throw new MfaError("El código no es válido.", "invalid_code");
    // updateMany con la condición evita que dos peticiones simultáneas acepten el mismo código.
    const updated = await prisma.userMfa.updateMany({
      where: { userId, OR: [{ lastUsedStep: null }, { lastUsedStep: { lt: step } }] },
      data: { lastUsedStep: step },
    });
    if (updated.count === 0) throw new MfaError("El código no es válido.", "invalid_code");
    return { method: "totp", remainingBackupCodes: mfa.backupCodes.length };
  }

  const normalized = normalizeBackupCode(code);
  if (normalized.length !== 10) throw new MfaError("El código no es válido.", "invalid_code");
  for (const candidate of mfa.backupCodes) {
    if (await bcrypt.compare(normalized, candidate.codeHash)) {
      const updated = await prisma.mfaBackupCode.updateMany({
        where: { id: candidate.id, usedAt: null },
        data: { usedAt: new Date(now) },
      });
      if (updated.count === 0) break;
      return { method: "backup_code", remainingBackupCodes: mfa.backupCodes.length - 1 };
    }
  }
  throw new MfaError("El código no es válido.", "invalid_code");
}

/** Restablecimiento por un administrador: borra el secreto y los códigos; la persona se inscribe de nuevo. */
export async function resetMfa(userId: string): Promise<void> {
  const prisma = getPrismaClient();
  await prisma.$transaction([
    prisma.userMfa.deleteMany({ where: { userId } }),
    prisma.user.update({ where: { id: userId }, data: { mfaEnabled: false } }),
  ]);
}
