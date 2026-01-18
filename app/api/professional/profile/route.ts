import { NextResponse } from "next/server";

import { errorResponse } from "@/app/api/_utils/response";
import { getPrismaClient } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/authz";

export async function GET() {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["PROFESIONAL"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const prisma = getPrismaClient();
  const professional = await prisma.professionalProfile.findUnique({
    where: { userId: sessionResult.user.id },
    include: { user: true, specialty: true },
  });

  if (!professional) {
    return errorResponse("Profesional no encontrado.", 404);
  }

  return NextResponse.json({
    profile: {
      name: professional.user.name,
      lastName: professional.user.lastName,
      email: professional.user.email,
      specialty: professional.specialty?.name ?? null,
    },
  });
}
