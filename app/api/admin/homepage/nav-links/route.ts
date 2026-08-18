import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJson } from "@/app/api/_utils/validation";
import { logAuditEvent } from "@/lib/audit";
import { getPrismaClient } from "@/lib/prisma";

import { requireAdmin, requiredHref, requiredText } from "../_lib";

const navLinkCreateSchema = z.object({
  href: requiredHref(500),
  label: requiredText(1, 120),
  isActive: z.boolean().optional(),
});

type NavLinkRecord = {
  id: string;
  href: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
};

function serializeNavLink(link: NavLinkRecord) {
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
  const navLinks = await prisma.homepageNavLink.findMany({ orderBy: { sortOrder: "asc" } });

  return NextResponse.json({ navLinks: navLinks.map(serializeNavLink) });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data: body, error } = await parseJson(request, navLinkCreateSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const maxSort = await prisma.homepageNavLink.aggregate({ _max: { sortOrder: true } });

  const navLink = await prisma.homepageNavLink.create({
    data: {
      href: body.href,
      label: body.label,
      isActive: body.isActive ?? true,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  await logAuditEvent({
    actor: { userId: auth.sessionUser.id, role: auth.sessionUser.role },
    action: "homepage.nav-links.created",
    resourceType: "homepage_nav_link",
    resourceId: navLink.id,
    targetLabel: navLink.label,
    status: "success",
    metadata: { href: navLink.href, isActive: navLink.isActive },
  });

  return NextResponse.json({ navLink: serializeNavLink(navLink) }, { status: 201 });
}
