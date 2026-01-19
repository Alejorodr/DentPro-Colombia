"use client";

import { useEffect, useState } from "react";

import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

type Template = {
  id: string;
  title: string;
  contentHtml: string;
  updatedAt: string;
};

type SignedConsent = {
  id: string;
  templateId: string;
  acceptedAt: string;
};

export function ClientConsentsPanel() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [consents, setConsents] = useState<SignedConsent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithRetry("/api/client/consents");
      if (!response.ok) {
        throw new Error("No se pudo cargar la información de consentimientos.");
      }
      const data = (await response.json()) as { templates?: Template[]; consents?: SignedConsent[] };
      setTemplates(data.templates ?? []);
      setConsents(data.consents ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleAccept = async (templateId: string) => {
    setError(null);
    const response = await fetchWithTimeout("/api/client/consents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId }),
    });

    if (!response.ok) {
      setError("No se pudo registrar el consentimiento.");
      return;
    }

    await load();
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Cargando consentimientos...</p>;
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Consentimientos</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Documentos pendientes</h1>
      </header>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {templates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-surface-muted/60 dark:text-slate-300">
          No hay consentimientos activos por el momento.
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => {
            const signed = consents.find((consent) => consent.templateId === template.id);
            return (
              <article
                key={template.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-surface-muted/70 dark:bg-surface-elevated"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{template.title}</h2>
                    <p className="text-xs text-slate-400">
                      Actualizado {new Date(template.updatedAt).toLocaleDateString("es-CO")}
                    </p>
                  </div>
                  {signed ? (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                      Aceptado {new Date(signed.acceptedAt).toLocaleDateString("es-CO")}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleAccept(template.id)}
                      className="rounded-xl bg-brand-indigo px-4 py-2 text-xs font-semibold text-white"
                    >
                      Aceptar consentimiento
                    </button>
                  )}
                </div>
                <div
                  className="prose prose-sm mt-4 max-w-none text-slate-600 dark:prose-invert dark:text-slate-300"
                  dangerouslySetInnerHTML={{ __html: template.contentHtml }}
                />
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
