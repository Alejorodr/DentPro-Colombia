import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJson } from "@/app/api/_utils/validation";
import { MARKETING_ICON_KEYS } from "@/lib/marketing/homepage-types";
import { getPrismaClient } from "@/lib/prisma";

import { requireAdmin, requiredAbsoluteHttpUrl, requiredText } from "../_lib";

const socialLinkCreateSchema = z.object({
  href: requiredAbsoluteHttpUrl(500),
  label: requiredText(1, 120),
  iconKey: z.enum(MARKETING_ICON_KEYS),
  isActive: z.boolean().optional(),
});

type SocialLinkRecord = {
  id: string;
  href: string;
  label: string;
  iconKey: (typeof MARKETING_ICON_KEYS)[number];
  sortOrder: number;
  isActive: boolean;
};

function serializeSocialLink(link: SocialLinkRecord) {
  return {
    id: link.id,
    href: link.href,
    label: link.label,
    iconKey: link.iconKey,
    sortOrder: link.sortOrder,
    isActive: link.isActive,
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const prisma = getPrismaClient();
  const socialLinks = await prisma.homepageSocialLink.findMany({ orderBy: { sortOrder: "asc" } });

  return NextResponse.json({ socialLinks: socialLinks.map(serializeSocialLink) });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data: body, error } = await parseJson(request, socialLinkCreateSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const maxSort = await prisma.homepageSocialLink.aggregate({ _max: { sortOrder: true } });

  const socialLink = await prisma.homepageSocialLink.create({
    data: {
      href: body.href,
      label: body.label,
      iconKey: body.iconKey,
      isActive: body.isActive ?? true,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json({ socialLink: serializeSocialLink(socialLink) }, { status: 201 });
}
