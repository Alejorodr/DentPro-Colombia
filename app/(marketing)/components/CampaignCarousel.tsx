import Image from "next/image";
import Link from "next/link";

import { getPrismaClient } from "@/lib/prisma";

export async function CampaignCarousel() {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  const prisma = getPrismaClient();
  const now = new Date();
  const campaigns = await prisma.campaign.findMany({
    where: {
      active: true,
      startAt: { lte: now },
      endAt: { gte: now },
    },
    orderBy: { startAt: "desc" },
    take: 6,
  });

  if (campaigns.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal">Campañas activas</p>
          <h2 className="text-2xl font-semibold text-slate-900">Promociones destacadas</h2>
        </div>
        <span className="text-xs font-semibold text-slate-500">Actualizado hoy</span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            className="min-w-[280px] max-w-xs rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60"
          >
            <div className="relative h-40 w-full overflow-hidden rounded-t-3xl">
              <Image
                src={campaign.imageUrl}
                alt={campaign.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 280px, 320px"
              />
            </div>
            <div className="space-y-3 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">{campaign.title}</p>
                {campaign.description ? (
                  <p className="text-xs text-slate-500">{campaign.description}</p>
                ) : null}
              </div>
              {campaign.ctaUrl ? (
                <Link
                  href={campaign.ctaUrl}
                  className="inline-flex rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white"
                >
                  {campaign.ctaText ?? "Ver más"}
                </Link>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
