import { NextResponse } from "next/server";

import { errorResponse } from "@/app/api/_utils/response";
import { getPrismaClient } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/authz";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["ADMINISTRADOR", "RECEPCIONISTA"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const { id } = await params;
  const prisma = getPrismaClient();
  const events = await prisma.appointmentEvent.findMany({
    where: { appointmentId: id },
    orderBy: { createdAt: "desc" },
    include: { actorUser: { select: { id: true, name: true, lastName: true, email: true } } },
  });

  return NextResponse.json({ events });
}
