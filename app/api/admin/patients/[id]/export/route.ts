import { NextResponse } from "next/server";

import { errorResponse, serviceUnavailableResponse } from "@/app/api/_utils/response";
import { getPaginationParams } from "@/app/api/_utils/pagination";
import { getRequestId } from "@/app/api/_utils/request";
import { requireRole, requireSession } from "@/lib/authz";
import { logClinicalAccess } from "@/lib/clinical/access-log";
import { buildPatientExport } from "@/lib/exports/patient-data";
import { getPrismaClient, isDatabaseUnavailableError } from "@/lib/prisma";
import { AccessLogAction } from "@prisma/client";

function getRouteFromRequest(request: Request) {
  try {
    return new URL(request.url).pathname;
  } catch {
    return request.url;
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const { id } = await params;
  const prisma = getPrismaClient();
  const { searchParams } = new URL(request.url);
  const { skip, take } = getPaginationParams(searchParams);

  try {
    const exportPayload = await buildPatientExport(prisma, id, {
      includeHiddenClinical: true,
      skip,
      take,
    });

    if (!exportPayload) {
      return errorResponse("Paciente no encontrado.", 404);
    }

    await logClinicalAccess({
      userId: sessionResult.user.id,
      patientId: id,
      action: AccessLogAction.EXPORT,
      route: getRouteFromRequest(request),
      requestId: getRequestId(request),
      metadata: { scope: "admin_patient_export", take, skip },
    });

    return NextResponse.json(exportPayload);
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return serviceUnavailableResponse("Base de datos temporalmente no disponible.", error.retryAfterMs);
    }
    throw error;
  }
}
