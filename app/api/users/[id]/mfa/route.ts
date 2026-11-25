import { NextResponse } from "next/server";

import { errorResponse } from "@/app/api/_utils/response";
import { logAuditEvent } from "@/lib/audit";
import { resetMfa } from "@/lib/auth/mfa-service";
import { requireRole, requireSession } from "@/lib/authz";
import { getPrismaClient } from "@/lib/prisma";

/**
 * Restablece el segundo factor de otro usuario (DOG-28): borra su secreto y sus códigos de
 * respaldo, y en su próximo acceso tiene que inscribirse de nuevo. Sus sesiones abiertas quedan
 * pendientes de inmediato, porque el servidor exige que el MFA siga activo.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse("No tienes permisos para restablecer la verificación en dos pasos.", 403);
  }

  const { id } = await params;
  // Con una sesión robada se podría cambiar el dispositivo propio; por eso lo hace otro administrador.
  if (id === sessionResult.user.id) {
    return errorResponse("Para restablecer tu propia verificación en dos pasos, pídeselo a otro administrador.", 400);
  }

  const prisma = getPrismaClient();
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
  if (!target) {
    return errorResponse("Usuario no encontrado.", 404);
  }

  await resetMfa(id);
  await logAuditEvent({
    actor: { userId: sessionResult.user.id, role: sessionResult.user.role },
    action: "auth.mfa.reset_by_admin",
    resourceType: "user",
    resourceId: id,
    targetLabel: target.email,
    status: "success",
  });

  return NextResponse.json({ status: "ok" });
}
