"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Bell, CalendarCheck, CheckCircle, Clock, WarningCircle } from "@/components/ui/Icon";
import { fetchWithRetry } from "@/lib/http";

type ActivityFeedItem = {
  id: string;
  type: string;
  actor: string;
  timestamp: string;
  message: string;
  patientName?: string;
  link?: string;
};

function iconForType(type: string) {
  if (type.includes("cancel")) return <WarningCircle className="h-4 w-4 text-rose-600" weight="fill" />;
  if (type.includes("status") || type.includes("completed")) return <CheckCircle className="h-4 w-4 text-emerald-600" weight="fill" />;
  if (type.includes("rescheduled") || type.includes("created")) return <CalendarCheck className="h-4 w-4 text-brand-teal" weight="fill" />;
  if (type.includes("notification")) return <Bell className="h-4 w-4 text-slate-500" weight="fill" />;
  return <Clock className="h-4 w-4 text-slate-400" weight="fill" />;
}

export function ActivityFeed({ title = "Actividad reciente", limit = 8 }: { title?: string; limit?: number }) {
  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      const response = await fetchWithRetry(`/api/activity/feed?limit=${limit}`);
      if (!response.ok) {
        if (active) {
          setError("No pudimos cargar la actividad clínica.");
          setLoading(false);
        }
        return;
      }
      const data = (await response.json()) as { items?: ActivityFeedItem[] };
      if (active) {
        setItems(data.items ?? []);
        setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [limit]);

  const content = useMemo(() => {
    if (loading) {
      return <p className="text-xs text-slate-500">Cargando actividad...</p>;
    }
    if (error) {
      return <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>;
    }
    if (items.length === 0) {
      return <p className="text-xs text-slate-500">Sin actividad reciente para mostrar.</p>;
    }
    return (
      <ol className="space-y-2" aria-label="Feed de actividad clínica">
        {items.map((item) => (
          <li key={item.id} tabIndex={0} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-teal/60 dark:border-surface-muted dark:bg-surface-base/70">
            <div className="flex items-start gap-2">
              <span className="mt-0.5">{iconForType(item.type)}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800 dark:text-white">{item.message}</p>
                <p className="text-slate-500 dark:text-slate-400">{item.patientName ? `${item.patientName} · ` : ""}{item.actor}</p>
                <p className="text-[11px] text-slate-400">{new Date(item.timestamp).toLocaleString("es-CO")}</p>
                {item.link ? <Link href={item.link} className="text-[11px] font-semibold text-brand-teal">Ver detalle</Link> : null}
              </div>
            </div>
          </li>
        ))}
      </ol>
    );
  }, [error, items, loading]);

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-surface-muted dark:bg-surface-base/60" aria-live="polite">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
      </div>
      {content}
    </section>
  );
}
