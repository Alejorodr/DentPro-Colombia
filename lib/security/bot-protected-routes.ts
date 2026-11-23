/**
 * Formularios públicos protegidos con Vercel BotID (DOG-17).
 * Lo comparten el cliente (`instrumentation-client.ts`, que adjunta la prueba del navegador
 * a estas peticiones) y el servidor (`isBotRequest`, que la verifica). Si agregas una ruta aquí,
 * llama también a `isBotRequest` en su handler.
 */
export const BOT_PROTECTED_ROUTES = [
  // Login con correo y contraseña (NextAuth Credentials).
  { path: "/api/auth/callback/credentials", method: "POST" },
  { path: "/api/auth/register", method: "POST" },
  { path: "/api/auth/forgot-password", method: "POST" },
  { path: "/api/auth/reset-password", method: "POST" },
] as const;

/** Prefijo de las rutas internas de BotID (script y proxy hacia Vercel). */
export const BOTID_PATH_PREFIX = "/149e9513-01fa-4fb0-aad4-566afd725d1b";
