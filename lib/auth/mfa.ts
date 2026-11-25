import { randomInt } from "node:crypto";

import type { UserRole } from "@/lib/auth/roles";

/**
 * Reglas del segundo factor (DOG-28). Obligatorio para los roles que ven datos clínicos o
 * administrativos de todos los pacientes.
 */
export const MFA_REQUIRED_ROLES: readonly UserRole[] = ["ADMINISTRADOR", "PROFESIONAL"];

export const MFA_ISSUER = "DentPro Colombia";
export const MFA_PAGE_PATH = "/auth/mfa";
export const BACKUP_CODE_COUNT = 10;

export function requiresMfa(role: UserRole | null | undefined): boolean {
  return !!role && MFA_REQUIRED_ROLES.includes(role);
}

/**
 * Una sesión queda pendiente si el rol exige MFA y falta alguna de las dos cosas: que la sesión
 * se haya verificado y que el usuario tenga el MFA activo. La segunda condición hace que un
 * restablecimiento por parte de un administrador obligue a inscribirse de nuevo aunque la sesión
 * ya estuviera verificada.
 */
export function isMfaPending(params: {
  role: UserRole | null | undefined;
  sessionVerified: boolean;
  mfaEnabled: boolean;
}): boolean {
  if (!requiresMfa(params.role)) return false;
  return !(params.sessionVerified && params.mfaEnabled);
}

// Sin 0/O, 1/I/L: se copian a mano desde papel.
const BACKUP_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const BACKUP_CODE_GROUP = 5;

/** 10 caracteres de 31 símbolos ≈ 49 bits por código, con formato `XXXXX-XXXXX`. */
export function generateBackupCodes(count = BACKUP_CODE_COUNT): string[] {
  return Array.from({ length: count }, () => {
    const chars = Array.from({ length: BACKUP_CODE_GROUP * 2 }, () => BACKUP_CODE_ALPHABET[randomInt(BACKUP_CODE_ALPHABET.length)]);
    return `${chars.slice(0, BACKUP_CODE_GROUP).join("")}-${chars.slice(BACKUP_CODE_GROUP).join("")}`;
  });
}

/** Mayúsculas y sin espacios ni guiones, para comparar lo que la persona escribe. */
export function normalizeBackupCode(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

export function looksLikeTotpCode(input: string): boolean {
  return /^\d{6}$/.test(input.replace(/\s/g, ""));
}
