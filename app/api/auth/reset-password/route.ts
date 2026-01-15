import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getPrismaClient } from "@/lib/prisma";
import { hashPasswordResetToken, validatePasswordPolicy } from "@/lib/auth/password-reset";
import { parseJson } from "@/app/api/_utils/validation";
import { enforceRateLimit } from "@/app/api/_utils/ratelimit";

const resetPasswordSchema = z.object({
  token: z.string().trim().min(10).max(256),
  password: z.string().min(10).max(200),
});

export async function POST(request: Request) {
  const rateLimited = await enforceRateLimit(request, "auth:reset-password", {
    limit: 5,
    window: "10 m",
    windowMs: 10 * 60 * 1000,
  });
  if (rateLimited) {
    return rateLimited;
  }

  const { data, error } = await parseJson(request, resetPasswordSchema);
  if (error) {
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
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: storedToken.id },
      data: { usedAt: now },
    }),
  ]);

  return NextResponse.json({ message: "Contraseña actualizada." }, { status: 200 });
}
