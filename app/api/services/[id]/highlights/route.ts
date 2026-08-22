import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { requireAdmin, requiredText } from "@/app/api/admin/homepage/_lib";
import { logAuditEvent } from "@/lib/audit";
import { getPrismaClient } from "@/lib/prisma";

const createHighlightSchema = z.object({
  text: requiredText(1, 220),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id: serviceId } = await context.params;
  const prisma = getPrismaClient();
  const service = await prisma.service.findUnique({ where: { id: serviceId }, select: { id: true } });
  if (!service) {
    return errorResponse("Servicio no encontrado.", 404);
  }

  const highlights = await prisma.serviceHighlight.findMany({
    where: { serviceId },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ highlights });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id: serviceId } = await context.params;
  const { data: body, error } = await parseJson(request, createHighlightSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const service = await prisma.service.findUnique({ where: { id: serviceId }, select: { id: true } });
  if (!service) {
    return errorResponse("Servicio no encontrado.", 404);
  }

  const maxSort = await prisma.serviceHighlight.aggregate({
    where: { serviceId },
    _max: { sortOrder: true },
  });

  const highlight = await prisma.serviceHighlight.create({
    data: {
      serviceId,
      text: body.text,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  await logAuditEvent({
    actor: { userId: auth.sessionUser.id, role: auth.sessionUser.role },
    action: "services.highlights.created",
    resourceType: "service_highlight",
    resourceId: highlight.id,
    targetLabel: highlight.text,
    status: "success",
    metadata: { serviceId },
  });

  return NextResponse.json({ highlight }, { status: 201 });
}
