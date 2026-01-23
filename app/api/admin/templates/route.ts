import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";
import { requireSession, requireRole } from "@/lib/authz";
import { ClinicDocumentTemplateType } from "@prisma/client";
import { sanitizeConsentHtml } from "@/lib/security/sanitize-html";

const templateSchema = z.object({
  type: z.nativeEnum(ClinicDocumentTemplateType),
  title: z.string().trim().min(1).max(120),
  contentHtml: z.string().trim().min(1),
  active: z.boolean().optional(),
});

export async function GET() {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const prisma = getPrismaClient();
  const templates = await prisma.clinicDocumentTemplate.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const { data: payload, error } = await parseJson(request, templateSchema);
  if (error) {
    return error;
  }

  const sanitizedContent = sanitizeConsentHtml(payload.contentHtml);
  const prisma = getPrismaClient();
  const template = await prisma.clinicDocumentTemplate.create({
    data: {
      type: payload.type,
      title: payload.title,
      contentHtml: sanitizedContent,
      active: payload.active ?? true,
    },
  });

  return NextResponse.json({ template }, { status: 201 });
}
