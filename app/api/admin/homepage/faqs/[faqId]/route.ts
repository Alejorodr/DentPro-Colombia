import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";

import { requireAdmin, requiredText } from "../../_lib";

const faqUpdateSchema = z
  .object({
    question: requiredText(1, 500).optional(),
    answer: requiredText(1, 2000).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, "Debes enviar al menos un campo para actualizar.");

type FaqRecord = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
};

function serializeFaq(faq: FaqRecord) {
  return {
    id: faq.id,
    question: faq.question,
    answer: faq.answer,
    sortOrder: faq.sortOrder,
    isActive: faq.isActive,
  };
}

export async function PATCH(request: Request, context: { params: Promise<{ faqId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { faqId } = await context.params;
  const { data: body, error } = await parseJson(request, faqUpdateSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const existing = await prisma.homepageFaq.findUnique({ where: { id: faqId } });
  if (!existing) return errorResponse("Pregunta frecuente no encontrada.", 404);

  const updated = await prisma.homepageFaq.update({ where: { id: faqId }, data: body });

  return NextResponse.json({ faq: serializeFaq(updated) });
}

export async function DELETE(_request: Request, context: { params: Promise<{ faqId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { faqId } = await context.params;
  const prisma = getPrismaClient();

  const existing = await prisma.homepageFaq.findUnique({ where: { id: faqId } });
  if (!existing) return errorResponse("Pregunta frecuente no encontrada.", 404);

  await prisma.homepageFaq.delete({ where: { id: faqId } });

  const remaining = await prisma.homepageFaq.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });

  await prisma.$transaction(
    remaining.map((item: { id: string }, index: number) =>
      prisma.homepageFaq.update({ where: { id: item.id }, data: { sortOrder: index } }),
    ),
  );

  return NextResponse.json({ ok: true });
}
