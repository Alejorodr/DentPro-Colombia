import { NextResponse } from "next/server";

import { getSessionUser } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { markAllNotificationsRead } from "@/lib/notifications";

export async function PATCH() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  const result = await markAllNotificationsRead({ userId: sessionUser.id });
  return NextResponse.json({ updatedCount: result.count });
}
