import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";

import { optionalAbsoluteHttpUrl, optionalText, requireAdmin, requiredText } from "../_lib";

const specialistCreateSchema = z.object({
  fullName: requiredText(1, 120),
  specialty: requiredText(1, 120),
  bioShort: requiredText(1, 600),
  imageUrl: optionalAbsoluteHttpUrl(500),
  altText: optionalText(180),
  isActive: z.boolean().optional(),
});

function serializeSpecialist(specialist: {
  id: string;
  fullName: string;
  specialty: string;
  bioShort: string;
  imageUrl: string | null;
  altText: string | null;
  sortOrder: number;
  isActive: boolean;
}) {
  return {
    id: specialist.id,
    fullName: specialist.fullName,
    specialty: specialist.specialty,
    bioShort: specialist.bioShort,
    imageUrl: specialist.imageUrl,
    altText: specialist.altText,
    sortOrder: specialist.sortOrder,
    isActive: specialist.isActive,
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const prisma = getPrismaClient();
  const specialists = await prisma.homepageSpecialist.findMany({ orderBy: { sortOrder: "asc" } });

  return NextResponse.json({ specialists: specialists.map(serializeSpecialist) });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data: body, error } = await parseJson(request, specialistCreateSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const maxSort = await prisma.homepageSpecialist.aggregate({ _max: { sortOrder: true } });

  const specialist = await prisma.homepageSpecialist.create({
    data: {
      fullName: body.fullName,
      specialty: body.specialty,
      bioShort: body.bioShort,
      imageUrl: body.imageUrl,
      altText: body.altText,
      isActive: body.isActive ?? true,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json({ specialist: serializeSpecialist(specialist) }, { status: 201 });
}
