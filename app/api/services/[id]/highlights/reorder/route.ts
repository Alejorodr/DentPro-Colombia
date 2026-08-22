import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { requireAdmin } from "@/app/api/admin/homepage/_lib";
import { logAuditEvent } from "@/lib/audit";
import { getPrismaClient } from "@/lib/prisma";

const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id: serviceId } = await context.params;
  const { data: body, error } = await parseJson(request, reorderSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const highlights = await prisma.serviceHighlight.findMany({
    where: { serviceId },
    select: { id: true },
  });

  if (highlights.length !== body.orderedIds.length) {
    return errorResponse("La lista de orden no coincide con la cantidad de highlights.", 400);
  }

  if (new Set(body.orderedIds).size !== body.orderedIds.length) {
    return errorResponse("La lista de orden contiene highlights duplicados.", 400);
  }

  const expected = new Set(highlights.map((item: { id: string }) => item.id));
  const received = new Set(body.orderedIds);
  if (received.size !== expected.size || [...received].some((id) => !expected.has(id))) {
    return errorResponse("La lista de orden contiene highlights inválidos.", 400);
  }

  await prisma.$transaction(
    body.orderedIds.map((id, index) =>
      prisma.serviceHighlight.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  await logAuditEvent({
    actor: { userId: auth.sessionUser.id, role: auth.sessionUser.role },
    action: "services.highlights.reordered",
    resourceType: "service_highlight",
    status: "success",
    metadata: { serviceId, itemCount: body.orderedIds.length, order: body.orderedIds },
  });

  return NextResponse.json({ ok: true });
}
