import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { requireAdmin, requiredText } from "@/app/api/admin/homepage/_lib";
import { logAuditEvent } from "@/lib/audit";
import { getPrismaClient } from "@/lib/prisma";

const updateHighlightSchema = z.object({
  text: requiredText(1, 220).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; highlightId: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id: serviceId, highlightId } = await context.params;
  const { data: body, error } = await parseJson(request, updateHighlightSchema);
  if (error) return error;

  if (!body.text) {
    return errorResponse("Debes enviar al menos un campo para actualizar.", 400);
  }

  const prisma = getPrismaClient();
  const existing = await prisma.serviceHighlight.findUnique({ where: { id: highlightId } });
  if (!existing || existing.serviceId !== serviceId) {
    return errorResponse("Highlight no encontrado.", 404);
  }

  const updated = await prisma.serviceHighlight.update({
    where: { id: highlightId },
    data: { text: body.text },
  });

  await logAuditEvent({
    actor: { userId: auth.sessionUser.id, role: auth.sessionUser.role },
    action: "services.highlights.updated",
    resourceType: "service_highlight",
    resourceId: updated.id,
    targetLabel: updated.text,
    status: "success",
    metadata: { serviceId },
  });

  return NextResponse.json({ highlight: updated });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; highlightId: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id: serviceId, highlightId } = await context.params;
  const prisma = getPrismaClient();

  const existing = await prisma.serviceHighlight.findUnique({ where: { id: highlightId } });
  if (!existing || existing.serviceId !== serviceId) {
    return errorResponse("Highlight no encontrado.", 404);
  }

  await prisma.serviceHighlight.delete({ where: { id: highlightId } });
  const remaining = await prisma.serviceHighlight.findMany({
    where: { serviceId },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });

  await prisma.$transaction(
    remaining.map((item: { id: string }, index: number) =>
      prisma.serviceHighlight.update({
        where: { id: item.id },
        data: { sortOrder: index },
      }),
    ),
  );

  await logAuditEvent({
    actor: { userId: auth.sessionUser.id, role: auth.sessionUser.role },
    action: "services.highlights.deleted",
    resourceType: "service_highlight",
    resourceId: existing.id,
    targetLabel: existing.text,
    status: "success",
    metadata: { serviceId },
  });

  return NextResponse.json({ ok: true });
}
