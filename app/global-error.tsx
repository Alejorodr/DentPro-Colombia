"use client";

import { useEffect, useState } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
};

export default function GlobalError({ error }: GlobalErrorProps) {
  const [requestId, setRequestId] = useState<string | null>(null);

  useEffect(() => {
    console.error("Global error", error);
    const id = globalThis?.document?.body?.dataset?.requestId ?? null;
    setRequestId(id);
  }, [error]);

  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50 px-6 text-slate-900">
        <div className="flex min-h-screen items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-lg font-semibold">Algo salió mal</h1>
            <p className="mt-2 text-sm text-slate-600">
              No pudimos cargar la aplicación. Por favor intenta nuevamente en unos minutos.
            </p>
            {error?.digest ? (
              <p className="mt-3 text-xs text-slate-500">Referencia: {error.digest}</p>
            ) : null}
            {requestId ? <p className="mt-1 text-xs text-slate-500">Request ID: {requestId}</p> : null}
          </div>
        </div>
      </body>
    </html>
  );
}
