import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/prisma";
import { hashPasswordResetToken, validatePasswordPolicy } from "@/lib/auth/password-reset";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const password = typeof body?.password === "string" ? body.password : "";

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
