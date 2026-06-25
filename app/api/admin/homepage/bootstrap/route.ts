import { logApiError } from "@/app/api/_utils/observability";
import { internalServerErrorResponse } from "@/app/api/_utils/response";
import { logAuditEvent } from "@/lib/audit";
import { bootstrapHomepageContent } from "@/lib/marketing/homepage";
import { getPrismaClient } from "@/lib/prisma";
import { requireAdmin } from "../_lib";

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    await bootstrapHomepageContent(getPrismaClient());

    await logAuditEvent({
      actor: { userId: auth.sessionUser.id, role: auth.sessionUser.role },
      action: "homepage.bootstrap.executed",
      resourceType: "homepage_settings",
      status: "success",
    });

    return Response.json({ ok: true });
  } catch (error) {
    logApiError(
      { event: "admin.homepage_bootstrap_failed", route: "/api/admin/homepage/bootstrap", userId: auth.sessionUser.id },
      error,
    );
    return internalServerErrorResponse("No se pudo poblar el contenido del homepage.");
  }
}
