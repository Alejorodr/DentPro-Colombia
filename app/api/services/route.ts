import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { buildPaginatedResponse, getPaginationParams } from "@/app/api/_utils/pagination";
import { parseJson } from "@/app/api/_utils/validation";
import { noHtml, requiredText } from "@/app/api/admin/homepage/_lib";
import { unstable_cache } from "next/cache";

import { CATALOG_CACHE_VERSION, CATALOG_REVALIDATE_SECONDS, CATALOG_TAGS } from "@/lib/cache/catalog";
import { getPrismaClient } from "@/lib/prisma";
import { MARKETING_ICON_KEYS } from "@/lib/marketing/homepage-types";
import { SERVICE_DETAIL_SLUGS } from "@/lib/marketing/service-detail-pages";
import { cupsCodeSchema } from "@/lib/regulatory/colombia";
import { Prisma } from "@prisma/client";

const serviceSchema = z.object({
  name: requiredText(1, 120),
  description: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional()
    .refine((value) => value == null || noHtml(value), "No se permite HTML."),
  priceCents: z.number().int().min(0),
  durationMinutes: z.number().int().min(0).nullable().optional(),
  active: z.boolean().optional(),
  specialtyId: z.string().uuid().nullable().optional(),
  iconKey: z.enum(MARKETING_ICON_KEYS).nullable().optional(),
  showOnHomepage: z.boolean().optional(),
  homepageSortOrder: z.number().int().min(0).optional(),
  detailSlug: z.enum(SERVICE_DETAIL_SLUGS).nullable().optional(),
  cupsCode: cupsCodeSchema.nullable().optional(),
});

async function queryServices(activeOnly: boolean, query: string | undefined, skip: number, take: number) {
  const prisma = getPrismaClient();
  const where: Prisma.ServiceWhereInput = {
    ...(activeOnly ? { active: true } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [services, total] = await Promise.all([
    prisma.service.findMany({ where, orderBy: { name: "asc" }, skip, take }),
    prisma.service.count({ where }),
  ]);
  return { services, total };
}

// DOG-14: los formularios de reserva piden siempre la misma lista; se cachea por
// (activos, página) y se invalida al escribir en Service. Las búsquedas libres no se cachean.
const listServicesCached = unstable_cache(
  (activeOnly: boolean, skip: number, take: number) => queryServices(activeOnly, undefined, skip, take),
  ["services-list", CATALOG_CACHE_VERSION],
  { tags: [CATALOG_TAGS.services], revalidate: CATALOG_REVALIDATE_SECONDS },
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("active") === "true";
  const query = searchParams.get("q")?.trim();
  const { page, pageSize, skip, take } = getPaginationParams(searchParams);

  const { services, total } = query
    ? await queryServices(activeOnly, query, skip, take)
    : await listServicesCached(activeOnly, skip, take);

  return NextResponse.json(buildPaginatedResponse(services, page, pageSize, total));
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !isAuthorized(sessionUser.role, ["ADMINISTRADOR"])) {
    return errorResponse("No autorizado.", 401);
  }

  const { data: body, error } = await parseJson(request, serviceSchema);
  if (error) {
    return error;
  }

  const prisma = getPrismaClient();
  const service = await prisma.service.create({
    data: {
      name: body.name,
      description: body.description ?? null,
      priceCents: body.priceCents,
      durationMinutes: body.durationMinutes ?? null,
      active: body.active ?? true,
      specialtyId: body.specialtyId ?? null,
      iconKey: body.iconKey ?? null,
      showOnHomepage: body.showOnHomepage ?? false,
      homepageSortOrder: body.homepageSortOrder ?? 0,
      detailSlug: body.detailSlug ?? null,
      cupsCode: body.cupsCode ?? null,
    },
  });

  return NextResponse.json(service);
}
