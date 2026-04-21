import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";

import { requireAdmin, requiredText } from "../../../../_lib";

const updateHighlightSchema = z.object({
  text: requiredText(1, 220).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ serviceId: string; highlightId: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { serviceId, highlightId } = await context.params;
  const { data: body, error } = await parseJson(request, updateHighlightSchema);
  if (error) return error;

  if (!body.text) {
    return errorResponse("Debes enviar al menos un campo para actualizar.", 400);
  }

  const prisma = getPrismaClient();
  const existing = await prisma.homepageServiceHighlight.findUnique({ where: { id: highlightId } });
  if (!existing || existing.homepageServiceId !== serviceId) {
    return errorResponse("Highlight no encontrado.", 404);
  }

  const updated = await prisma.homepageServiceHighlight.update({
    where: { id: highlightId },
    data: { text: body.text },
  });

  return NextResponse.json({ highlight: updated });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ serviceId: string; highlightId: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { serviceId, highlightId } = await context.params;
  const prisma = getPrismaClient();

  const existing = await prisma.homepageServiceHighlight.findUnique({ where: { id: highlightId } });
  if (!existing || existing.homepageServiceId !== serviceId) {
    return errorResponse("Highlight no encontrado.", 404);
  }

  await prisma.homepageServiceHighlight.delete({ where: { id: highlightId } });
  const remaining = await prisma.homepageServiceHighlight.findMany({
    where: { homepageServiceId: serviceId },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });

  await prisma.$transaction(
    remaining.map((item: { id: string }, index: number) =>
      prisma.homepageServiceHighlight.update({
        where: { id: item.id },
        data: { sortOrder: index },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
