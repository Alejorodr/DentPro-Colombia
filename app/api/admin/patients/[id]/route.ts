import { NextResponse } from "next/server";

import { errorResponse } from "@/app/api/_utils/response";
import { getPrismaClient } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/authz";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse("No tienes permisos para ver esta ficha.", 403);
  }

  const { id } = await params;
  const prisma = getPrismaClient();

  const patient = await prisma.patientProfile.findUnique({
    where: { id },
    select: {
      id: true,
      patientCode: true,
      documentId: true,
      phone: true,
      user: { select: { name: true, lastName: true } },
    },
  });

  if (!patient) {
    return errorResponse("Paciente no encontrado.", 404);
  }

  return NextResponse.json({ patient });
}
