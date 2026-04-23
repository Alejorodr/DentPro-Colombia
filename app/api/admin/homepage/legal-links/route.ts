import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";

import { requireAdmin, requiredHref, requiredText } from "../_lib";

const legalLinkCreateSchema = z.object({
  href: requiredHref(500),
  label: requiredText(1, 120),
  isActive: z.boolean().optional(),
});

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

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const prisma = getPrismaClient();
  const legalLinks = await prisma.homepageLegalLink.findMany({ orderBy: { sortOrder: "asc" } });

  return NextResponse.json({ legalLinks: legalLinks.map(serializeLegalLink) });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data: body, error } = await parseJson(request, legalLinkCreateSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const maxSort = await prisma.homepageLegalLink.aggregate({ _max: { sortOrder: true } });

  const legalLink = await prisma.homepageLegalLink.create({
    data: {
      href: body.href,
      label: body.label,
      isActive: body.isActive ?? true,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json({ legalLink: serializeLegalLink(legalLink) }, { status: 201 });
}
