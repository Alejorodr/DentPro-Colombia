import { NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email/password-reset";
import { generatePasswordResetToken, normalizeEmail } from "@/lib/auth/password-reset";
import { getAppBaseUrl } from "@/lib/auth/url";

const GENERIC_MESSAGE = "Si el correo existe, te enviaremos instrucciones para restablecer tu contraseña.";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const emailRaw = body?.email;

  if (typeof emailRaw !== "string" || emailRaw.trim().length === 0) {
    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
  }

  const email = normalizeEmail(emailRaw);
  const prisma = getPrismaClient();

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (user) {
      const now = new Date();
      await prisma.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });

      const { token, tokenHash, expiresAt } = generatePasswordResetToken(now);

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      const baseUrl = getAppBaseUrl();
      const resetLink = `${baseUrl}/auth/reset-password?token=${token}`;

      await sendPasswordResetEmail({ to: user.email, resetLink });
    }
  } catch (error) {
    console.error("Failed to process forgot password request", error);
  }

  return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
}
