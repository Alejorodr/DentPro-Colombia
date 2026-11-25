import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { checkMfaRateLimit, requireMfaSession } from "@/app/api/auth/mfa/_lib";
import { logAuditEvent } from "@/lib/audit";
import { MfaError, verifyMfaChallenge } from "@/lib/auth/mfa-service";
import { markSessionMfaVerified } from "@/lib/auth/mfa-session";

const schema = z.object({ code: z.string().trim().min(6).max(16) });

/** Segundo paso del inicio de sesión: código de la app o código de respaldo (DOG-28). */
export async function POST(request: Request) {
  const session = await requireMfaSession();
  if (session.error) return session.error;

  const { data, error } = await parseJson(request, schema);
  if (error) return error;

  const limited = await checkMfaRateLimit(session.user.id);
  if (limited) return limited;

  const actor = { userId: session.user.id, role: session.user.role };
  try {
    const result = await verifyMfaChallenge(session.user.id, data.code);
    await markSessionMfaVerified();
    await logAuditEvent({
      actor,
      action: result.method === "backup_code" ? "auth.mfa.backup_code_used" : "auth.mfa.verified",
      resourceType: "auth",
      resourceId: session.user.id,
      status: "success",
      metadata: result.method === "backup_code" ? { remainingBackupCodes: result.remainingBackupCodes } : undefined,
    });
    return NextResponse.json(result);
  } catch (caught) {
    if (!(caught instanceof MfaError)) throw caught;
    await logAuditEvent({
      actor,
      action: "auth.mfa.failed",
      resourceType: "auth",
      resourceId: session.user.id,
      status: "failure",
      metadata: { reason: caught.code },
    });
    return errorResponse(caught.message, caught.code === "invalid_code" ? 400 : 409);
  }
}
