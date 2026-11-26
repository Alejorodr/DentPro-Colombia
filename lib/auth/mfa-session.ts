import { decode, encode } from "next-auth/jwt";
import { cookies } from "next/headers";

import { getJwtSecretString } from "@/lib/auth/jwt";
import { getInferredAuthBaseUrl, getSessionCookieName, shouldUseSecureCookies } from "@/lib/auth/runtime";

/**
 * Marca la sesión actual como verificada con el segundo factor (DOG-28). Reescribe el JWT de
 * NextAuth con el claim `mfaVerified`: el callback `jwt` conserva el token tal como llega, así que
 * el claim sobrevive a las renovaciones, y un inicio de sesión nuevo emite un token sin él.
 */

/** Igual al `session.maxAge` por defecto de Auth.js (30 días); authConfig no lo cambia. */
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export const MFA_VERIFIED_CLAIM = "mfaVerified";

export function isSessionMfaVerified(token: Record<string, unknown> | null | undefined): boolean {
  return token?.[MFA_VERIFIED_CLAIM] === true;
}

export async function markSessionMfaVerified(): Promise<boolean> {
  const cookieStore = await cookies();
  const baseUrl = getInferredAuthBaseUrl();
  const cookieName = getSessionCookieName(baseUrl);
  const current = cookieStore.get(cookieName)?.value;
  if (!current) return false;

  const secret = getJwtSecretString();
  const token = await decode({ token: current, secret, salt: cookieName });
  if (!token) return false;

  const next = await encode({
    token: { ...token, [MFA_VERIFIED_CLAIM]: true },
    secret,
    salt: cookieName,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  cookieStore.set(cookieName, next, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    secure: shouldUseSecureCookies(baseUrl),
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return true;
}
