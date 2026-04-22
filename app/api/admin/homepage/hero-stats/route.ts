import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";

import { requireAdmin, requiredText } from "../_lib";

const heroStatCreateSchema = z.object({
  label: requiredText(1, 120),
  description: requiredText(1, 280),
  isActive: z.boolean().optional(),
});

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

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const prisma = getPrismaClient();
  const stats = await prisma.homepageHeroStat.findMany({ orderBy: { sortOrder: "asc" } });

  return NextResponse.json({ heroStats: stats.map(serializeHeroStat) });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data: body, error } = await parseJson(request, heroStatCreateSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const maxSort = await prisma.homepageHeroStat.aggregate({ _max: { sortOrder: true } });

  const heroStat = await prisma.homepageHeroStat.create({
    data: {
      label: body.label,
      description: body.description,
      isActive: body.isActive ?? true,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json({ heroStat: serializeHeroStat(heroStat) }, { status: 201 });
}
