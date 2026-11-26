import { NextResponse } from "next/server";

import { errorResponse } from "@/app/api/_utils/response";
import { requireMfaSession } from "@/app/api/auth/mfa/_lib";
import { MfaError, startMfaEnrollment } from "@/lib/auth/mfa-service";

/** Empieza la inscripción del segundo factor: devuelve el secreto y el QR (DOG-28). */
export async function POST() {
  const session = await requireMfaSession();
  if (session.error) return session.error;

  try {
    const enrollment = await startMfaEnrollment(session.user);
    return NextResponse.json(enrollment, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof MfaError) return errorResponse(error.message, 409);
    throw error;
  }
}
