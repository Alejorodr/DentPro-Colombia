import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJson } from "@/app/api/_utils/validation";
import { MARKETING_ICON_KEYS } from "@/lib/marketing/homepage-types";
import { getPrismaClient } from "@/lib/prisma";

import { normalizeMarketingIconKey, requireAdmin, requiredText } from "../_lib";

const contactSupportItemCreateSchema = z.object({
  iconKey: z.enum(MARKETING_ICON_KEYS),
  text: requiredText(1, 280),
  isActive: z.boolean().optional(),
});

type ContactSupportItemRecord = {
  id: string;
  iconKey: string;
  text: string;
  sortOrder: number;
  isActive: boolean;
};

function serializeContactSupportItem(item: ContactSupportItemRecord) {
  return {
    id: item.id,
    iconKey: normalizeMarketingIconKey(item.iconKey, "Headset"),
    text: item.text,
    sortOrder: item.sortOrder,
    isActive: item.isActive,
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const prisma = getPrismaClient();
  const contactSupportItems = await prisma.homepageContactSupportItem.findMany({ orderBy: { sortOrder: "asc" } });

  return NextResponse.json({ contactSupportItems: contactSupportItems.map(serializeContactSupportItem) });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data: body, error } = await parseJson(request, contactSupportItemCreateSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const maxSort = await prisma.homepageContactSupportItem.aggregate({ _max: { sortOrder: true } });

  const contactSupportItem = await prisma.homepageContactSupportItem.create({
    data: {
      iconKey: body.iconKey,
      text: body.text,
      isActive: body.isActive ?? true,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json({ contactSupportItem: serializeContactSupportItem(contactSupportItem) }, { status: 201 });
}
