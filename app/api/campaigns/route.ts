import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { logApiError } from "@/app/api/_utils/observability";
import { errorResponse, internalServerErrorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { logAuditEvent } from "@/lib/audit";
import { getPrismaClient } from "@/lib/prisma";
import {
  optionalAbsoluteHttpUrl,
  optionalText,
  requireAdmin,
  requiredAbsoluteHttpUrl,
  requiredText,
} from "@/app/api/admin/homepage/_lib";

const campaignSchema = z.object({
  title: requiredText(1, 120),
  description: optionalText(500).optional(),
  imageUrl: requiredAbsoluteHttpUrl(500),
  ctaText: optionalText(80).optional(),
  ctaUrl: optionalAbsoluteHttpUrl(500).optional(),
  startAt: z.string().trim().min(1),
  endAt: z.string().trim().min(1),
  active: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedActiveOnly = searchParams.get("active") === "true";
    const sessionUser = await getSessionUser();
    const canReadAllCampaigns = Boolean(sessionUser && isAuthorized(sessionUser.role, ["ADMINISTRADOR"]));
    const activeOnly = requestedActiveOnly || !canReadAllCampaigns;
    const now = new Date();

    const prisma = getPrismaClient();
    const campaigns = await prisma.campaign.findMany({
      where: {
        ...(activeOnly
          ? {
              active: true,
              startAt: { lte: now },
              endAt: { gte: now },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    logApiError(
      {
        event: "campaigns.list_failed",
        route: "/api/campaigns",
      },
      error,
    );
    return internalServerErrorResponse();
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { data: body, error } = await parseJson(request, campaignSchema);
    if (error) {
      return error;
    }

    const startAt = new Date(body.startAt);
    const endAt = new Date(body.endAt);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || startAt >= endAt) {
      return errorResponse("Rango de fechas inválido.", 400);
    }

    const prisma = getPrismaClient();
    const campaign = await prisma.campaign.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        imageUrl: body.imageUrl,
        ctaText: body.ctaText ?? null,
        ctaUrl: body.ctaUrl ?? null,
        startAt,
        endAt,
        active: body.active ?? true,
      },
    });

    await logAuditEvent({
      actor: {
        userId: auth.sessionUser.id,
        role: auth.sessionUser.role,
      },
      action: "campaign.created",
      resourceType: "campaign",
      resourceId: campaign.id,
      targetLabel: campaign.title,
      status: "success",
      metadata: {
        active: campaign.active,
        hasDescription: Boolean(campaign.description),
      },
    });

    return NextResponse.json(campaign);
  } catch (error) {
    await logAuditEvent({
      actor: {
        userId: auth.sessionUser.id,
        role: auth.sessionUser.role,
      },
      action: "campaign.created",
      resourceType: "campaign",
      status: "failure",
    });
    logApiError(
      {
        event: "campaigns.create_failed",
        route: "/api/campaigns",
        userId: auth.sessionUser.id,
      },
      error,
    );
    return internalServerErrorResponse("No se pudo crear la campaña.");
  }
}
