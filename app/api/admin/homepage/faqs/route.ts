import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";

import { requireAdmin, requiredText } from "../_lib";

const faqCreateSchema = z.object({
  question: requiredText(1, 500),
  answer: requiredText(1, 2000),
  isActive: z.boolean().optional(),
});

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

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const prisma = getPrismaClient();
  const faqs = await prisma.homepageFaq.findMany({ orderBy: { sortOrder: "asc" } });

  return NextResponse.json({ faqs: faqs.map(serializeFaq) });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data: body, error } = await parseJson(request, faqCreateSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const maxSort = await prisma.homepageFaq.aggregate({ _max: { sortOrder: true } });

  const faq = await prisma.homepageFaq.create({
    data: {
      question: body.question,
      answer: body.answer,
      isActive: body.isActive ?? true,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json({ faq: serializeFaq(faq) }, { status: 201 });
}
