import type { BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";

import { getSessionCookieName } from "../../lib/auth/runtime";
import { TEST_BYPASS_USER_ID } from "../../lib/auth/test-bypass";

type SessionRole = "ADMINISTRADOR" | "RECEPCIONISTA" | "PACIENTE" | "PROFESIONAL";

export async function seedRoleSession(context: BrowserContext, role: SessionRole) {
  const secret = process.env.NEXTAUTH_SECRET ?? "test-secret";
  const token = await encode({
    secret,
    maxAge: 60 * 60 * 2,
    token: {
      role,
      userId: TEST_BYPASS_USER_ID,
      sub: TEST_BYPASS_USER_ID,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://127.0.0.1:3000";
  const sessionCookieName = getSessionCookieName(baseUrl);

  const urls = [baseUrl];
  const cookies = urls.flatMap((url) => [
    {
      name: sessionCookieName,
      value: token,
      httpOnly: true,
      sameSite: "Lax" as const,
      secure: sessionCookieName.startsWith("__Secure-"),
      url,
    },
    {
      name: "dentpro-test-role",
      value: role,
      sameSite: "Lax" as const,
      url,
    },
  ]);

  await context.addCookies(cookies);
}

export async function seedAdminSession(context: BrowserContext) {
  await seedRoleSession(context, "ADMINISTRADOR");
}
