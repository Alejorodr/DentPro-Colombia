import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";
import { requireSession, requireRole } from "@/lib/authz";
import { ClinicDocumentTemplateType } from "@prisma/client";

const consentSchema = z.object({
  templateId: z.string().uuid(),
});

function hashIp(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function GET() {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["PACIENTE"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const prisma = getPrismaClient();
  const patient = await prisma.patientProfile.findUnique({
    where: { userId: sessionResult.user.id },
    select: { id: true },
  });

  if (!patient) {
    return errorResponse("Paciente no encontrado.", 404);
  }

  const templates = await prisma.clinicDocumentTemplate.findMany({
    where: { type: ClinicDocumentTemplateType.CONSENT, active: true },
    orderBy: { updatedAt: "desc" },
  });

  const consents = await prisma.signedConsent.findMany({
    where: { patientId: patient.id },
    include: { template: true },
  });

  return NextResponse.json({ templates, consents });
}

export async function POST(request: Request) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["PACIENTE"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const { data: payload, error } = await parseJson(request, consentSchema);
  if (error) {
    return error;
  }

  const prisma = getPrismaClient();
  const patient = await prisma.patientProfile.findUnique({
    where: { userId: sessionResult.user.id },
    select: { id: true },
  });

  if (!patient) {
    return errorResponse("Paciente no encontrado.", 404);
  }

  const template = await prisma.clinicDocumentTemplate.findUnique({
    where: { id: payload.templateId },
  });

  if (!template || template.type !== ClinicDocumentTemplateType.CONSENT || !template.active) {
    return errorResponse("Plantilla inválida.", 404);
  }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ipHash = forwarded ? hashIp(forwarded) : null;
  const userAgent = request.headers.get("user-agent") ?? null;

  const consent = await prisma.signedConsent.create({
    data: {
      patientId: patient.id,
      templateId: template.id,
      acceptedByUserId: sessionResult.user.id,
      ipHash,
      userAgent,
    },
  });

  return NextResponse.json({ consent }, { status: 201 });
}
