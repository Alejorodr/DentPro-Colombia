/**
 * Única fuente de verdad para leer el secreto de autenticación.
 *
 * Orden de prioridad: AUTH_JWT_SECRET → NEXTAUTH_SECRET → AUTH_SECRET.
 * Un valor vacío o solo con espacios cuenta como ausente: así una variable
 * definida pero vacía (p. ej. en Vercel) no corta la cadena de respaldo.
 *
 * Sin dependencias de Node (`crypto`, etc.) para poder usarse desde proxy.ts.
 */
type AuthSecretEnv = Readonly<Record<string, string | undefined>>;

export const AUTH_SECRET_ENV_KEYS = ["AUTH_JWT_SECRET", "NEXTAUTH_SECRET", "AUTH_SECRET"] as const;

export function readConfiguredAuthSecret(env: AuthSecretEnv = process.env): string | undefined {
  for (const key of AUTH_SECRET_ENV_KEYS) {
    const value = env[key];
    if (value && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}

export function hasConfiguredAuthSecret(env: AuthSecretEnv = process.env): boolean {
  return readConfiguredAuthSecret(env) !== undefined;
}
