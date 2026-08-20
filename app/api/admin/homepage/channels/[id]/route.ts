import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { logAuditEvent } from "@/lib/audit";
import { getPrismaClient } from "@/lib/prisma";

import { requireAdmin, requiredText } from "../../_lib";
import { CHANNEL_TYPES, PLACEMENTS, validateValue } from "../_types";

const channelUpdateSchema = z
  .object({
    type: z.enum(CHANNEL_TYPES).optional(),
    value: requiredText(1, 200).optional(),
    label: requiredText(1, 120).optional(),
    placements: z.array(z.enum(PLACEMENTS)).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, "Debes enviar al menos un campo para actualizar.");

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

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const { data: body, error } = await parseJson(request, channelUpdateSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const existing = await prisma.homepageChannel.findUnique({ where: { id } });
  if (!existing) {
    return errorResponse("Canal no encontrado.", 404);
  }

  // Cross-field validation: if either type or value is being updated, validate the effective pair
  if (body.type !== undefined || body.value !== undefined) {
    const effectiveType = body.type ?? existing.type;
    const effectiveValue = body.value ?? existing.value;
    if (!validateValue(effectiveType, effectiveValue)) {
      return errorResponse("Valor inválido para el tipo de canal seleccionado.", 400);
    }
  }

  const updated = await prisma.homepageChannel.update({ where: { id }, data: body });

  await logAuditEvent({
    actor: { userId: auth.sessionUser.id, role: auth.sessionUser.role },
    action: "homepage.channels.updated",
    resourceType: "homepage_channel",
    resourceId: updated.id,
    targetLabel: updated.label,
    status: "success",
    metadata: { changedFields: Object.keys(body) },
  });

  return NextResponse.json({ channel: serializeChannel(updated) });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const prisma = getPrismaClient();

  const existing = await prisma.homepageChannel.findUnique({ where: { id } });
  if (!existing) {
    return errorResponse("Canal no encontrado.", 404);
  }

  await prisma.homepageChannel.delete({ where: { id } });

  const remaining = await prisma.homepageChannel.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true } });
  await prisma.$transaction(
    remaining.map((item: { id: string }, index: number) =>
      prisma.homepageChannel.update({ where: { id: item.id }, data: { sortOrder: index } }),
    ),
  );

  await logAuditEvent({
    actor: { userId: auth.sessionUser.id, role: auth.sessionUser.role },
    action: "homepage.channels.deleted",
    resourceType: "homepage_channel",
    resourceId: existing.id,
    targetLabel: existing.label,
    status: "success",
  });

  return NextResponse.json({ ok: true });
}
