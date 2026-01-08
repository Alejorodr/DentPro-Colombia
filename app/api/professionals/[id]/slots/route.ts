import { NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/prisma";
import { getSessionUser } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  const { id } = await params;
  const prisma = getPrismaClient();
  const slots = await prisma.timeSlot.findMany({
    where: { professionalId: id },
    orderBy: { startAt: "asc" },
  });

  return NextResponse.json(slots);
}
