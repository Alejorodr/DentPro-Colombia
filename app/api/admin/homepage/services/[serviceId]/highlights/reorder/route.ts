import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";

import { requireAdmin } from "../../../../_lib";

const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});

export async function PATCH(request: Request, context: { params: Promise<{ serviceId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { serviceId } = await context.params;
  const { data: body, error } = await parseJson(request, reorderSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const highlights = await prisma.homepageServiceHighlight.findMany({
    where: { homepageServiceId: serviceId },
    select: { id: true },
  });

  if (highlights.length !== body.orderedIds.length) {
    return errorResponse("La lista de orden no coincide con la cantidad de highlights.", 400);
  }

  const expected = new Set(highlights.map((item: { id: string }) => item.id));
  for (const id of body.orderedIds) {
    if (!expected.has(id)) {
      return errorResponse("La lista de orden contiene highlights inválidos.", 400);
    }
  }

  await prisma.$transaction(
    body.orderedIds.map((id, index) =>
      prisma.homepageServiceHighlight.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
