import type { BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";

export async function seedAdminSession(context: BrowserContext) {
  const secret = process.env.NEXTAUTH_SECRET ?? "test-secret";
  const token = await encode({
    secret,
    maxAge: 60 * 60 * 2,
    token: {
      role: "ADMINISTRADOR",
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
      value: "ADMINISTRADOR",
      sameSite: "Lax" as const,
      url,
    },
  ]);

  await context.addCookies(cookies);
}
