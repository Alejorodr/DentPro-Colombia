import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";

import { requireAdmin, requiredText } from "../../../_lib";

const createHighlightSchema = z.object({
  text: requiredText(1, 220),
});

export async function POST(request: Request, context: { params: Promise<{ serviceId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { serviceId } = await context.params;
  const { data: body, error } = await parseJson(request, createHighlightSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const service = await prisma.homepageService.findUnique({ where: { id: serviceId }, select: { id: true } });
  if (!service) {
    return errorResponse("Servicio no encontrado.", 404);
  }

  const maxSort = await prisma.homepageServiceHighlight.aggregate({
    where: { homepageServiceId: serviceId },
    _max: { sortOrder: true },
  });

  const highlight = await prisma.homepageServiceHighlight.create({
    data: {
      homepageServiceId: serviceId,
      text: body.text,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json({ highlight }, { status: 201 });
}
