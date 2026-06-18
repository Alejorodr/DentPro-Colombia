"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { logger } from "@/lib/logger";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function PortalError({ error, reset }: ErrorProps) {
  const [requestId, setRequestId] = useState<string | null>(null);

  useEffect(() => {
    logger.error({ digest: error.digest, message: error.message }, "Portal error");
    const id = globalThis?.document?.body?.dataset?.requestId ?? null;
    setRequestId(id);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/10 dark:border-surface-muted/60 dark:bg-surface-muted">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
          No pudimos cargar esta sección
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Ocurrió un error inesperado. Puedes intentar de nuevo o volver al inicio del portal.
        </p>
        {error.digest ? (
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
            Referencia: {error.digest}
          </p>
        ) : null}
        {requestId ? (
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Request ID: {requestId}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full bg-brand-teal px-4 py-2 text-sm font-semibold text-white hover:bg-brand-indigo dark:bg-accent-cyan dark:text-slate-900 dark:hover:bg-accent-cyan/80"
          >
            Reintentar
          </button>
          <Link
            href="/portal"
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-surface-muted dark:text-slate-200 dark:hover:bg-surface-elevated"
          >
            Ir al portal
          </Link>
        </div>
      </div>
    </div>
  );
}
