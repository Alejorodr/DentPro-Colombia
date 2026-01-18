import { NextResponse } from "next/server";
import { z } from "zod";

import { getPrismaClient } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email/password-reset";
import { generatePasswordResetToken, normalizeEmail } from "@/lib/auth/password-reset";
import { getAppBaseUrl } from "@/lib/auth/url";
import { enforceRateLimit } from "@/app/api/_utils/ratelimit";
import { getRequestId } from "@/app/api/_utils/request";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

const GENERIC_MESSAGE = "Si el correo existe, te enviaremos instrucciones para restablecer tu contraseña.";
const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(120),
});

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const startedAt = Date.now();
  const rateLimited = await enforceRateLimit(request, "auth:forgot-password", {
    limit: 10,
    window: "1 m",
    windowMs: 60 * 1000,
  });
  if (rateLimited) {
    logger.warn({
      event: "auth.forgot_password.rate_limited",
      route: "/api/auth/forgot-password",
      requestId,
      status: 429,
    });
    return rateLimited;
  }

  logger.info({
    event: "auth.forgot_password.start",
    route: "/api/auth/forgot-password",
    requestId,
  });

  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  const emailRaw = parsed.success ? parsed.data.email : null;

  if (!emailRaw) {
    logger.info({
      event: "auth.forgot_password.invalid_payload",
      route: "/api/auth/forgot-password",
      requestId,
      status: 200,
      durationMs: Date.now() - startedAt,
    });
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
    Sentry.captureException(error);
    logger.error({
      event: "auth.forgot_password.failed",
      route: "/api/auth/forgot-password",
      requestId,
      status: 500,
      durationMs: Date.now() - startedAt,
      error,
    });
  }

  logger.info({
    event: "auth.forgot_password.success",
    route: "/api/auth/forgot-password",
    requestId,
    status: 200,
    durationMs: Date.now() - startedAt,
  });
  return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
}
