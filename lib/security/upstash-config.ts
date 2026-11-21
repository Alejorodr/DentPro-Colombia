export type UpstashRestConfig = { url: string; token: string };

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

/**
 * Credenciales REST de Upstash Redis. Acepta los nombres propios de Upstash y los que crea la
 * integración de Vercel Marketplace (KV_REST_API_*). Nunca usa el token de solo lectura: el
 * limitador necesita escribir (INCR/EXPIRE).
 */
export function getUpstashRestConfig(): UpstashRestConfig | null {
  const url = readEnv("UPSTASH_REDIS_REST_URL") ?? readEnv("KV_REST_API_URL");
  const token = readEnv("UPSTASH_REDIS_REST_TOKEN") ?? readEnv("KV_REST_API_TOKEN");
  return url && token ? { url, token } : null;
}
