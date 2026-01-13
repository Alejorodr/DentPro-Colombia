"use client";

import { useState } from "react";
import Link from "next/link";

export function NextVisitActions({ detailsHref }: { detailsHref: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-300 dark:border-surface-muted/70 dark:text-slate-200"
          onClick={() => setOpen(true)}
        >
          Reschedule
        </button>
        <Link
          href={detailsHref}
          className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-blue-700"
        >
          Details
        </Link>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-elevated">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Próximamente</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              La opción de reprogramación estará disponible muy pronto.
            </p>
            <button
              type="button"
              className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              onClick={() => setOpen(false)}
            >
              Entendido
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
