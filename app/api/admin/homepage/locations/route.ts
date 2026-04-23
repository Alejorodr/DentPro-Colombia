import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";

import { requireAdmin, requiredText } from "../_lib";

const locationCreateSchema = z.object({
  name: requiredText(1, 180),
  description: requiredText(1, 280),
  isActive: z.boolean().optional(),
});

type LocationRecord = {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
};

function serializeLocation(location: LocationRecord) {
  return {
    id: location.id,
    name: location.name,
    description: location.description,
    sortOrder: location.sortOrder,
    isActive: location.isActive,
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const prisma = getPrismaClient();
  const locations = await prisma.homepageLocation.findMany({ orderBy: { sortOrder: "asc" } });

  return NextResponse.json({ locations: locations.map(serializeLocation) });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data: body, error } = await parseJson(request, locationCreateSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const maxSort = await prisma.homepageLocation.aggregate({ _max: { sortOrder: true } });

  const location = await prisma.homepageLocation.create({
    data: {
      name: body.name,
      description: body.description,
      isActive: body.isActive ?? true,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json({ location: serializeLocation(location) }, { status: 201 });
}
