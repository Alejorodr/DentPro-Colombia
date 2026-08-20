import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { logAuditEvent } from "@/lib/audit";
import { getPrismaClient } from "@/lib/prisma";

import { requireAdmin } from "../../_lib";

const reorderSchema = z.object({ orderedIds: z.array(z.string().uuid()).min(1) });

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data: body, error } = await parseJson(request, reorderSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const channels = await prisma.homepageChannel.findMany({ select: { id: true } });

  if (channels.length !== body.orderedIds.length) {
    return errorResponse("La lista de orden no coincide con la cantidad de canales.", 400);
  }
  if (new Set(body.orderedIds).size !== body.orderedIds.length) {
    return errorResponse("La lista de orden contiene canales duplicados.", 400);
  }
  const expected = new Set(channels.map((item: { id: string }) => item.id));
  if ([...body.orderedIds].some((id) => !expected.has(id))) {
    return errorResponse("La lista de orden contiene canales inválidos.", 400);
  }

  await prisma.$transaction(
    body.orderedIds.map((id, index) =>
      prisma.homepageChannel.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );

  await logAuditEvent({
    actor: { userId: auth.sessionUser.id, role: auth.sessionUser.role },
    action: "homepage.channels.reordered",
    resourceType: "homepage_channel",
    status: "success",
    metadata: { itemCount: body.orderedIds.length, order: body.orderedIds },
  });

  return NextResponse.json({ ok: true });
}
