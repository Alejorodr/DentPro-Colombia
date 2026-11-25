import { auth } from "@/auth";
import { checkIdentifierRateLimit } from "@/app/api/_utils/ratelimit";
import { errorResponse } from "@/app/api/_utils/response";
import { requiresMfa } from "@/lib/auth/mfa";

/**
 * Sesión para las rutas del segundo factor (DOG-28). A diferencia de requireSession, acepta una
 * sesión pendiente: es justamente la que necesita inscribirse o verificar.
 */
export async function requireMfaSession() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.role || !user.email) {
    return { error: errorResponse("No autorizado.", 401) };
  }
  if (!requiresMfa(user.role)) {
    return { error: errorResponse("Tu cuenta no usa verificación en dos pasos.", 403) };
  }
  return { user: { id: user.id, role: user.role, email: user.email, mfaPending: user.mfaPending ?? false } };
}

// 5 intentos cada 15 minutos por cuenta: con 6 dígitos, adivinar un código queda fuera de alcance.
const MFA_RATE_LIMIT = { limit: 5, window: "15 m", windowMs: 15 * 60 * 1000 } as const;

export async function checkMfaRateLimit(userId: string) {
  const result = await checkIdentifierRateLimit("auth:mfa", userId, MFA_RATE_LIMIT);
  if (result.allowed) return null;
  return errorResponse(
    result.reason === "unavailable"
      ? "No pudimos verificar el código en este momento. Intenta de nuevo en unos minutos."
      : "Demasiados intentos. Espera 15 minutos e intenta de nuevo.",
    result.reason === "unavailable" ? 503 : 429,
  );
}
