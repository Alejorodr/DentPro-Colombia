import { NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("active") === "true";

  const prisma = getPrismaClient();
  const services = await prisma.service.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(services);
}
