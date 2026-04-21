import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { MARKETING_ICON_KEYS } from "@/lib/marketing/homepage-types";
import { getPrismaClient } from "@/lib/prisma";

import { requireAdmin, requiredText } from "../../_lib";

const serviceUpdateSchema = z
  .object({
    title: requiredText(1, 180).optional(),
    description: requiredText(1, 1200).optional(),
    iconKey: z.enum(MARKETING_ICON_KEYS).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, "Debes enviar al menos un campo para actualizar.");

function serializeService(service: {
  id: string;
  title: string;
  description: string;
  iconKey: string;
  sortOrder: number;
  isActive: boolean;
  highlights: Array<{ id: string; text: string; sortOrder: number }>;
}) {
  return {
    id: service.id,
    title: service.title,
    description: service.description,
    iconKey: service.iconKey,
    sortOrder: service.sortOrder,
    isActive: service.isActive,
    highlights: service.highlights.map((highlight) => ({
      id: highlight.id,
      text: highlight.text,
      sortOrder: highlight.sortOrder,
    })),
  };
}

export async function PATCH(request: Request, context: { params: Promise<{ serviceId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { serviceId } = await context.params;
  const { data: body, error } = await parseJson(request, serviceUpdateSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const existing = await prisma.homepageService.findUnique({ where: { id: serviceId } });
  if (!existing) {
    return errorResponse("Servicio no encontrado.", 404);
  }

  const updated = await prisma.homepageService.update({
    where: { id: serviceId },
    data: body,
    include: { highlights: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json({ service: serializeService(updated) });
}

export async function DELETE(_request: Request, context: { params: Promise<{ serviceId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { serviceId } = await context.params;
  const prisma = getPrismaClient();

  const existing = await prisma.homepageService.findUnique({ where: { id: serviceId } });
  if (!existing) {
    return errorResponse("Servicio no encontrado.", 404);
  }

  await prisma.homepageService.delete({ where: { id: serviceId } });
  const remaining = await prisma.homepageService.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });

  await prisma.$transaction(
    remaining.map((item: { id: string }, index: number) =>
      prisma.homepageService.update({
        where: { id: item.id },
        data: { sortOrder: index },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
