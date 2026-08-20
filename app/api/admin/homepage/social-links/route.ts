import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJson } from "@/app/api/_utils/validation";
import { logAuditEvent } from "@/lib/audit";
import { MARKETING_ICON_KEYS } from "@/lib/marketing/homepage-types";
import { getPrismaClient } from "@/lib/prisma";

import { normalizeMarketingIconKey, requireAdmin, requiredAbsoluteHttpUrl, requiredText } from "../_lib";

const socialLinkCreateSchema = z.object({
  href: requiredAbsoluteHttpUrl(500),
  label: requiredText(1, 120),
  iconKey: z.enum(MARKETING_ICON_KEYS),
  isActive: z.boolean().optional(),
  placements: z.array(z.enum(["INFOBAR", "FLOATING", "FOOTER", "BOOKING"])).default([]),
});

type SocialLinkRecord = {
  id: string;
  href: string;
  label: string;
  iconKey: string;
  sortOrder: number;
  isActive: boolean;
  placements: string[];
};

function serializeSocialLink(link: SocialLinkRecord) {
  return {
    id: link.id,
    href: link.href,
    label: link.label,
    iconKey: normalizeMarketingIconKey(link.iconKey, "InstagramLogo"),
    sortOrder: link.sortOrder,
    isActive: link.isActive,
    placements: link.placements,
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
      placements: body.placements,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  await logAuditEvent({
    actor: { userId: auth.sessionUser.id, role: auth.sessionUser.role },
    action: "homepage.social-links.created",
    resourceType: "homepage_social_link",
    resourceId: socialLink.id,
    targetLabel: socialLink.label,
    status: "success",
    metadata: { href: socialLink.href, iconKey: socialLink.iconKey, isActive: socialLink.isActive },
  });

  return NextResponse.json({ socialLink: serializeSocialLink(socialLink) }, { status: 201 });
}
