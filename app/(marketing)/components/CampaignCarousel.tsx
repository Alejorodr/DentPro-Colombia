"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Campaign = {
  id: string | number;
  title: string;
  description?: string | null;
  imageUrl: string;
  ctaText?: string | null;
  ctaUrl?: string | null;
  active: boolean;
  startAt?: string | null;
  endAt?: string | null;
};

export function CampaignCarousel() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/campaigns", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load campaigns: ${response.status}`);
        }
        const data = (await response.json()) as Campaign[] | { items?: Campaign[]; campaigns?: Campaign[] };
        const list = Array.isArray(data) ? data : data.items ?? data.campaigns ?? [];
        if (!cancelled) {
          setCampaigns(list);
        }
      } catch {
        if (!cancelled) {
          setCampaigns([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleCampaigns = useMemo(() => {
    const now = new Date();
    return campaigns.filter((campaign) => {
      if (!campaign.active) {
        return false;
      }
      const startOk = !campaign.startAt || new Date(campaign.startAt) <= now;
      const endOk = !campaign.endAt || new Date(campaign.endAt) >= now;
      return startOk && endOk;
    });
  }, [campaigns]);

  if (!loading && visibleCampaigns.length === 0) {
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
        {(loading ? new Array(3).fill(null) : visibleCampaigns).map((campaign, index) => (
          <div
            key={campaign?.id ?? `placeholder-${index}`}
            className="min-w-[280px] max-w-xs rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60"
          >
            <div className="relative h-40 w-full overflow-hidden rounded-t-3xl">
              {campaign ? (
                <Image
                  src={campaign.imageUrl}
                  alt={campaign.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 280px, 320px"
                />
              ) : null}
            </div>
            <div className="space-y-3 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">{campaign ? campaign.title : "\u00A0"}</p>
                {campaign?.description ? (
                  <p className="text-xs text-slate-500">{campaign.description}</p>
                ) : null}
              </div>
              {campaign?.ctaUrl ? (
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
