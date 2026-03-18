import type { BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";

import { getSessionCookieName } from "../../lib/auth/runtime";
import type { SeededUsersByRole } from "./seed";

type SessionRole = "ADMINISTRADOR" | "RECEPCIONISTA" | "PACIENTE" | "PROFESIONAL";

function resolveSeededUser(role: SessionRole, seededUsers?: SeededUsersByRole) {
  const seededUser = seededUsers?.[role];
  if (!seededUser?.id || !seededUser.email) {
    throw new Error(`Missing seeded user for role ${role}. Run seedTestData and pass its return value to seedRoleSession.`);
  }

  return seededUser;
}

export async function seedRoleSession(context: BrowserContext, role: SessionRole, seededUsers?: SeededUsersByRole) {
  const seededUser = resolveSeededUser(role, seededUsers);
  const secret = process.env.NEXTAUTH_SECRET ?? "test-secret";
  const token = await encode({
    secret,
    maxAge: 60 * 60 * 2,
    token: {
      role,
      email: seededUser.email,
      userId: seededUser.id,
      sub: seededUser.id,
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
    {
      name: "dentpro-test-user-email",
      value: seededUser.email,
      sameSite: "Lax" as const,
      url,
    },
  ]);

  await context.addCookies(cookies);
}

export async function seedAdminSession(context: BrowserContext, seededUsers?: SeededUsersByRole) {
  await seedRoleSession(context, "ADMINISTRADOR", seededUsers);
}
