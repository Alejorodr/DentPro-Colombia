import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJson } from "@/app/api/_utils/validation";
import { logAuditEvent } from "@/lib/audit";
import { getPrismaClient } from "@/lib/prisma";

import { requireAdmin, requiredText } from "../_lib";
import { CHANNEL_TYPES, PLACEMENTS, validateValue } from "./_types";

const channelCreateSchema = z
  .object({
    type: z.enum(CHANNEL_TYPES),
    value: requiredText(1, 200),
    label: requiredText(1, 120),
    placements: z.array(z.enum(PLACEMENTS)).default([]),
    isActive: z.boolean().optional(),
  })
  .refine((payload) => validateValue(payload.type, payload.value), {
    message: "Valor inválido para el tipo de canal seleccionado.",
    path: ["value"],
  });

type ChannelRecord = {
  id: string;
  type: string;
  value: string;
  label: string;
  placements: string[];
  sortOrder: number;
  isActive: boolean;
};

function serializeChannel(channel: ChannelRecord) {
  return {
    id: channel.id,
    type: channel.type,
    value: channel.value,
    label: channel.label,
    placements: channel.placements,
    sortOrder: channel.sortOrder,
    isActive: channel.isActive,
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const prisma = getPrismaClient();
  const channels = await prisma.homepageChannel.findMany({ orderBy: { sortOrder: "asc" } });

  return NextResponse.json({ channels: channels.map(serializeChannel) });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data: body, error } = await parseJson(request, channelCreateSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const maxSort = await prisma.homepageChannel.aggregate({ _max: { sortOrder: true } });

  const channel = await prisma.homepageChannel.create({
    data: {
      type: body.type,
      value: body.value,
      label: body.label,
      placements: body.placements,
      isActive: body.isActive ?? true,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  await logAuditEvent({
    actor: { userId: auth.sessionUser.id, role: auth.sessionUser.role },
    action: "homepage.channels.created",
    resourceType: "homepage_channel",
    resourceId: channel.id,
    targetLabel: channel.label,
    status: "success",
    metadata: { type: channel.type, placements: channel.placements },
  });

  return NextResponse.json({ channel: serializeChannel(channel) }, { status: 201 });
}
