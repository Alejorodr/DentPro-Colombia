import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { requireSession } from "@/lib/authz";
import { getActivityFeed } from "@/lib/activity/feed";
import { logger } from "@/lib/logger";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).max(160).optional(),
  type: z.string().min(1).max(120).optional(),
  appointmentId: z.string().min(1).max(80).optional(),
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const rawQuery = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = querySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return errorResponse("Parámetros inválidos para activity feed.", 400);
  }

  const items = await getActivityFeed({
    userId: sessionResult.user.id,
    role: sessionResult.user.role,
    limit: parsed.data.limit,
    cursor: parsed.data.cursor,
    filters: {
      type: parsed.data.type,
      appointmentId: parsed.data.appointmentId,
      since: parsed.data.since ? new Date(parsed.data.since) : undefined,
      until: parsed.data.until ? new Date(parsed.data.until) : undefined,
    },
  });

  logger.info({
    event: "activity_feed_read",
    action: "activity_feed_read",
    actor: sessionResult.user.role,
    appointmentId: parsed.data.appointmentId ?? null,
    timestamp: new Date().toISOString(),
    itemCount: items.events.length,
    result: "ok",
  });

  return NextResponse.json(items);
}
