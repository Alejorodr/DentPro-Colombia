import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getPrismaClient } from "@/lib/prisma";
import { hashPasswordResetToken, validatePasswordPolicy } from "@/lib/auth/password-reset";
import { PASSWORD_POLICY_MESSAGE, PASSWORD_POLICY_REGEX } from "@/lib/auth/password-policy";
import { parseJson } from "@/app/api/_utils/validation";
import { enforceRateLimit } from "@/app/api/_utils/ratelimit";
import { getRequestId } from "@/app/api/_utils/request";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

const resetPasswordSchema = z.object({
  token: z.string().trim().min(10).max(256),
  password: z.string().min(8).max(200).regex(PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE),
});

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const startedAt = Date.now();
  const rateLimited = await enforceRateLimit(request, "auth:reset-password", {
    limit: 10,
    window: "1 m",
    windowMs: 60 * 1000,
  });
  if (rateLimited) {
    logger.warn({
      event: "auth.reset_password.rate_limited",
      route: "/api/auth/reset-password",
      requestId,
      status: 429,
    });
    return rateLimited;
  }

  logger.info({
    event: "auth.reset_password.start",
    route: "/api/auth/reset-password",
    requestId,
  });

  const { data, error } = await parseJson(request, resetPasswordSchema);
  if (error) {
    logger.warn({
      event: "auth.reset_password.invalid_payload",
      route: "/api/auth/reset-password",
      requestId,
      status: 400,
      durationMs: Date.now() - startedAt,
    });
    return error;
  }

  const { token, password } = data;

  if (!token || !password) {
    return NextResponse.json({ message: "Solicitud inválida." }, { status: 400 });
  }

  const policy = validatePasswordPolicy(password);
  if (!policy.valid) {
    return NextResponse.json({ message: policy.message }, { status: 400 });
  }

  const prisma = getPrismaClient();
  const tokenHash = hashPasswordResetToken(token);
  const now = new Date();

  try {
    const storedToken = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: now },
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!storedToken) {
      return NextResponse.json({ message: "El token es inválido o expiró." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: storedToken.userId },
        data: { passwordHash, passwordChangedAt: now },
      }),
      prisma.passwordResetToken.update({
        where: { id: storedToken.id },
        data: { usedAt: now },
      }),
    ]);
  } catch (resetError) {
    Sentry.captureException(resetError);
    logger.error({
      event: "auth.reset_password.failed",
      route: "/api/auth/reset-password",
      requestId,
      status: 500,
      durationMs: Date.now() - startedAt,
      error: resetError,
    });
    return NextResponse.json({ message: "No se pudo actualizar la contraseña." }, { status: 500 });
  }

  logger.info({
    event: "auth.reset_password.success",
    route: "/api/auth/reset-password",
    requestId,
    status: 200,
    durationMs: Date.now() - startedAt,
  });

  return NextResponse.json({ message: "Contraseña actualizada." }, { status: 200 });
}
