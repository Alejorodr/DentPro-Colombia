import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";

import { requireAdmin, requiredHref, requiredText } from "../../_lib";

const legalLinkUpdateSchema = z
  .object({
    href: requiredHref(500).optional(),
    label: requiredText(1, 120).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, "Debes enviar al menos un campo para actualizar.");

type LegalLinkRecord = {
  id: string;
  href: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
};

function serializeLegalLink(link: LegalLinkRecord) {
  return {
    id: link.id,
    href: link.href,
    label: link.label,
    sortOrder: link.sortOrder,
    isActive: link.isActive,
  };
}

export async function PATCH(request: Request, context: { params: Promise<{ linkId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { linkId } = await context.params;
  const { data: body, error } = await parseJson(request, legalLinkUpdateSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const existing = await prisma.homepageLegalLink.findUnique({ where: { id: linkId } });
  if (!existing) {
    return errorResponse("Enlace legal no encontrado.", 404);
  }

  const updated = await prisma.homepageLegalLink.update({
    where: { id: linkId },
    data: body,
  });

  return NextResponse.json({ legalLink: serializeLegalLink(updated) });
}

export async function DELETE(_request: Request, context: { params: Promise<{ linkId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { linkId } = await context.params;
  const prisma = getPrismaClient();

  const existing = await prisma.homepageLegalLink.findUnique({ where: { id: linkId } });
  if (!existing) {
    return errorResponse("Enlace legal no encontrado.", 404);
  }

  await prisma.homepageLegalLink.delete({ where: { id: linkId } });

  const remaining = await prisma.homepageLegalLink.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });

  await prisma.$transaction(
    remaining.map((item: { id: string }, index: number) =>
      prisma.homepageLegalLink.update({
        where: { id: item.id },
        data: { sortOrder: index },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
