import type { BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";

type SessionRole = "ADMINISTRADOR" | "RECEPCIONISTA" | "PACIENTE" | "PROFESIONAL";

export async function seedRoleSession(context: BrowserContext, role: SessionRole) {
  const secret = process.env.NEXTAUTH_SECRET ?? "test-secret";
  const token = await encode({
    secret,
    maxAge: 60 * 60 * 2,
    token: {
      role,
      userId: "test-user",
      sub: "test-user",
    },
  });

  const urls = ["http://127.0.0.1:3000", "http://localhost:3000"];
  const cookies = urls.flatMap((url) => [
    {
      name: "next-auth.session-token",
      value: token,
      httpOnly: true,
      sameSite: "Lax" as const,
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
