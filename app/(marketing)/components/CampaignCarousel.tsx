import Image from "next/image";
import Link from "next/link";

import { getPrismaClient } from "@/lib/prisma";

type Campaign = {
  id: string | number;
  title: string;
  description?: string | null;
  imageUrl: string;
  ctaText?: string | null;
  ctaUrl?: string | null;
};

export async function CampaignCarousel() {
  if (!process.env.DATABASE_URL) return null;
  const now = new Date();
  const prisma = getPrismaClient();

  const campaigns = (await prisma.campaign.findMany({
    where: {
      active: true,
      startAt: { lte: now },
      endAt: { gte: now },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      id: true,
      title: true,
      description: true,
      imageUrl: true,
      ctaText: true,
      ctaUrl: true,
    },
  })) as Campaign[];

  if (campaigns.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-8" aria-label="Campañas promocionales activas">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Promociones destacadas</h2>
        </div>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Actualizado hoy</span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2" role="list">
        {campaigns.map((campaign) => (
          <article
            key={campaign.id}
            className="relative min-w-[280px] max-w-xs overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/90 shadow-xl shadow-slate-900/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl dark:border-surface-muted/60 dark:bg-surface-base/85 dark:shadow-surface-dark"
            role="listitem"
          >
            <div className="relative h-40 w-full overflow-hidden rounded-t-[1.75rem]">
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
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{campaign.title}</p>
                {campaign.description ? <p className="text-xs text-slate-500 dark:text-slate-400">{campaign.description}</p> : null}
              </div>
              {campaign.ctaUrl ? (
                <Link
                  href={campaign.ctaUrl}
                  className="inline-flex rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white hover:bg-brand-indigo dark:bg-accent-cyan dark:text-slate-900 dark:hover:bg-accent-cyan/80"
                >
                  {campaign.ctaText ?? "Ver más"}
                </Link>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
