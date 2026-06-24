import crypto from "node:crypto";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { getPrismaClient } from "@/lib/prisma";
import { errorResponse } from "@/app/api/_utils/response";
import { requireRole, requireSession } from "@/lib/authz";
import { logger } from "@/lib/logger";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse("No tienes permisos para resetear contraseñas.", 403);
  }

  const { id } = await params;
  const prisma = getPrismaClient();

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, passwordHash: true },
  });

  if (!existing) {
    return errorResponse("Usuario no encontrado.", 404);
  }

  if (!existing.passwordHash) {
    return errorResponse("Este usuario no tiene contraseña local.", 400);
  }

  const tempPassword = crypto.randomBytes(12).toString("base64url");
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  await prisma.user.update({
    where: { id },
    data: {
      passwordHash,
      mustChangePassword: true,
      passwordChangedAt: new Date(),
    },
  });

  logger.info({
    event: "user.password_reset_by_admin",
    userId: id,
    actorId: sessionResult.user.id,
    actorRole: sessionResult.user.role,
  });

  return NextResponse.json({ tempPassword });
}
