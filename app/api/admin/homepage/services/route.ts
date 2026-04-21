import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJson } from "@/app/api/_utils/validation";
import { MARKETING_ICON_KEYS } from "@/lib/marketing/homepage-types";
import { getPrismaClient } from "@/lib/prisma";

import { requireAdmin, requiredText } from "../_lib";

const serviceCreateSchema = z.object({
  title: requiredText(1, 180),
  description: requiredText(1, 1200),
  iconKey: z.enum(MARKETING_ICON_KEYS),
  isActive: z.boolean().optional(),
});

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

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const prisma = getPrismaClient();
  const services = await prisma.homepageService.findMany({
    orderBy: { sortOrder: "asc" },
    include: { highlights: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json({ services: services.map(serializeService) });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data: body, error } = await parseJson(request, serviceCreateSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const maxSort = await prisma.homepageService.aggregate({ _max: { sortOrder: true } });
  const service = await prisma.homepageService.create({
    data: {
      title: body.title,
      description: body.description,
      iconKey: body.iconKey,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      isActive: body.isActive ?? true,
    },
    include: { highlights: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json({ service: serializeService(service) }, { status: 201 });
}
