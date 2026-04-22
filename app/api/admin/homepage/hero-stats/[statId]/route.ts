import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";

import { requireAdmin, requiredText } from "../../_lib";

const heroStatUpdateSchema = z
  .object({
    label: requiredText(1, 120).optional(),
    description: requiredText(1, 280).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, "Debes enviar al menos un campo para actualizar.");

type HeroStatRecord = {
  id: string;
  label: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
};

function serializeHeroStat(stat: HeroStatRecord) {
  return {
    id: stat.id,
    label: stat.label,
    description: stat.description,
    sortOrder: stat.sortOrder,
    isActive: stat.isActive,
  };
}

export async function PATCH(request: Request, context: { params: Promise<{ statId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { statId } = await context.params;
  const { data: body, error } = await parseJson(request, heroStatUpdateSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const existing = await prisma.homepageHeroStat.findUnique({ where: { id: statId } });
  if (!existing) {
    return errorResponse("Estadística del hero no encontrada.", 404);
  }

  const updated = await prisma.homepageHeroStat.update({
    where: { id: statId },
    data: body,
  });

  return NextResponse.json({ heroStat: serializeHeroStat(updated) });
}

export async function DELETE(_request: Request, context: { params: Promise<{ statId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { statId } = await context.params;
  const prisma = getPrismaClient();

  const existing = await prisma.homepageHeroStat.findUnique({ where: { id: statId } });
  if (!existing) {
    return errorResponse("Estadística del hero no encontrada.", 404);
  }

  await prisma.homepageHeroStat.delete({ where: { id: statId } });

  const remaining = await prisma.homepageHeroStat.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });

  await prisma.$transaction(
    remaining.map((item: { id: string }, index: number) =>
      prisma.homepageHeroStat.update({
        where: { id: item.id },
        data: { sortOrder: index },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
