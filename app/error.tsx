"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: ErrorProps) {
  const [requestId, setRequestId] = useState<string | null>(null);

  useEffect(() => {
    console.error("Route error", error);
    const id = globalThis?.document?.body?.dataset?.requestId ?? null;
    setRequestId(id);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-semibold">No pudimos cargar esta pantalla</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Estamos teniendo problemas temporales para acceder a la información. Intenta nuevamente en unos minutos.
        </p>
        {error?.digest ? (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Referencia: {error.digest}</p>
        ) : null}
        {requestId ? (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Request ID: {requestId}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
            onClick={() => reset()}
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
