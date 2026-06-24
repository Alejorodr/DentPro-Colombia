import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { getPrismaClient } from "@/lib/prisma";
import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { requireSession } from "@/lib/authz";
import { PASSWORD_POLICY_MESSAGE, PASSWORD_POLICY_REGEX } from "@/lib/auth/password-policy";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "La contraseña actual es requerida."),
  newPassword: z.string().min(8).max(200).regex(PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE),
});

export async function POST(request: Request) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const { data: payload, error } = await parseJson(request, changePasswordSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: sessionResult.user.id },
    select: { passwordHash: true },
  });

  if (!user) return errorResponse("Usuario no encontrado.", 404);

  if (!user.passwordHash) {
    return errorResponse("Tu cuenta usa autenticación de Google. No tiene contraseña local.", 400);
  }

  const isMatch = await bcrypt.compare(payload.currentPassword, user.passwordHash);
  if (!isMatch) {
    return errorResponse("La contraseña actual es incorrecta.", 400);
  }

  const newHash = await bcrypt.hash(payload.newPassword, 10);
  await prisma.user.update({
    where: { id: sessionResult.user.id },
    data: {
      passwordHash: newHash,
      mustChangePassword: false,
      passwordChangedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
