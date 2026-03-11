import { NextResponse } from "next/server";

import { errorResponse } from "@/app/api/_utils/response";
import { requireSession } from "@/lib/authz";
import { getActivityFeed } from "@/lib/activity/feed";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 20;

  const items = await getActivityFeed({
    userId: sessionResult.user.id,
    role: sessionResult.user.role,
    limit,
  });

  logger.info({
    event: "activity.feed.read",
    action: "read_feed",
    actor: sessionResult.user.role,
    timestamp: new Date().toISOString(),
    itemCount: items.length,
  });

  return NextResponse.json({ items });
}
