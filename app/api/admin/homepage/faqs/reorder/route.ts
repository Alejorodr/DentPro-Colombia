import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";

import { requireAdmin } from "../../_lib";

const reorderSchema = z.object({ orderedIds: z.array(z.string().uuid()).min(1) });

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data: body, error } = await parseJson(request, reorderSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  await prisma.$transaction(
    body.orderedIds.map((id: string, index: number) =>
      prisma.homepageFaq.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );

  return NextResponse.json({ ok: true });
}
