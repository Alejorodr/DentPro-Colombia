import crypto from "crypto";

export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function generatePasswordResetToken(now: Date = new Date()) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashPasswordResetToken(token);
  const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TOKEN_TTL_MS);

  return { token, tokenHash, expiresAt };
}

export function hashPasswordResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function isPasswordResetTokenExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function validatePasswordPolicy(password: string): { valid: boolean; message?: string } {
  if (!PASSWORD_POLICY_REGEX.test(password)) {
    return {
      valid: false,
      message: "La contraseña debe tener al menos 10 caracteres, una mayúscula, una minúscula y un número.",
    };
  }

  return { valid: true };
}
