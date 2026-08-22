"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

type ContactCopyForm = {
  contactTitle: string;
  contactDescription: string;
  contactSupportTitle: string;
  contactLocationsTitle: string;
  contactBrand: string;
  contactMapEmbedUrl: string;
};

const EMPTY_FORM: ContactCopyForm = {
  contactTitle: "",
  contactDescription: "",
  contactSupportTitle: "",
  contactLocationsTitle: "",
  contactBrand: "",
  contactMapEmbedUrl: "",
};

type ApiResponse = {
  settings?: Partial<Record<keyof ContactCopyForm, string | null>>;
  error?: string;
  details?: Array<{ path: string; message: string }>;
};

function normalizeForm(input: Partial<Record<keyof ContactCopyForm, string | null>>): ContactCopyForm {
  const output = { ...EMPTY_FORM };
  for (const key of Object.keys(output) as Array<keyof ContactCopyForm>) {
    output[key] = input[key] ?? "";
  }
  return output;
}

export function AdminContactCopyPanel() {
  const [form, setForm] = useState<ContactCopyForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await fetchWithRetry("/api/admin/homepage/settings");
    const body = (await response.json().catch(() => null)) as ApiResponse | null;
    if (!response.ok || !body?.settings) {
      setError(body?.error ?? "No se pudo cargar el bloque de contacto.");
      setLoading(false);
      return;
    }
    setForm(normalizeForm(body.settings));
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const onChange = (key: keyof ContactCopyForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    const response = await fetchWithTimeout("/api/admin/homepage/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = (await response.json().catch(() => null)) as ApiResponse | null;
    if (!response.ok) {
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudieron guardar los cambios.");
      setSaving(false);
      return;
    }
    setForm(normalizeForm(body?.settings ?? form));
    setSuccess("Bloque de contacto actualizado.");
    setSaving(false);
  };

  if (loading) {
    return <p className="text-sm text-slate-600 dark:text-slate-300">Cargando bloque de contacto...</p>;
  }

  return (
    <div className="space-y-4">
      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Homepage CMS</p>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Contacto</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">Encabezados y textos del bloque de contacto.</p>
      </section>

      <div className="grid gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-surface-muted/80 dark:bg-surface-elevated/80 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Título</span>
          <input className="input h-11 text-sm" value={form.contactTitle} onChange={(e) => onChange("contactTitle", e.target.value)} disabled={saving} />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Marca de firma</span>
          <input className="input h-11 text-sm" value={form.contactBrand} onChange={(e) => onChange("contactBrand", e.target.value)} disabled={saving} />
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Descripción</span>
          <textarea className="input min-h-28 text-sm" value={form.contactDescription} onChange={(e) => onChange("contactDescription", e.target.value)} disabled={saving} />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Título soporte</span>
          <input className="input h-11 text-sm" value={form.contactSupportTitle} onChange={(e) => onChange("contactSupportTitle", e.target.value)} disabled={saving} />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Título ubicaciones</span>
          <input className="input h-11 text-sm" value={form.contactLocationsTitle} onChange={(e) => onChange("contactLocationsTitle", e.target.value)} disabled={saving} />
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">URL mapa (solo HTTPS)</span>
          <input className="input h-11 text-sm" type="url" value={form.contactMapEmbedUrl} onChange={(e) => onChange("contactMapEmbedUrl", e.target.value)} disabled={saving} />
          <p className="text-xs text-slate-500 dark:text-slate-400">Se guarda como URL controlada; no se admite HTML embed.</p>
        </label>
      </div>

      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p> : null}

      <button
        type="button"
        className="rounded-full bg-brand-teal px-5 py-2 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => void onSave()}
        disabled={saving}
      >
        {saving ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  );
}
