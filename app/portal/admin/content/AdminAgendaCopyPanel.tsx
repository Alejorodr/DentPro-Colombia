"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

type AgendaCopyForm = {
  bookingTitle: string;
  bookingDescription: string;
  bookingBenefitsTitle: string;
  bookingScheduleNote: string;
  bookingConsentNote: string;
};

const EMPTY_FORM: AgendaCopyForm = {
  bookingTitle: "",
  bookingDescription: "",
  bookingBenefitsTitle: "",
  bookingScheduleNote: "",
  bookingConsentNote: "",
};

type ApiResponse = {
  settings?: Partial<Record<keyof AgendaCopyForm, string | null>>;
  error?: string;
  details?: Array<{ path: string; message: string }>;
};

function normalizeForm(input: Partial<Record<keyof AgendaCopyForm, string | null>>): AgendaCopyForm {
  const output = { ...EMPTY_FORM };
  for (const key of Object.keys(output) as Array<keyof AgendaCopyForm>) {
    output[key] = input[key] ?? "";
  }
  return output;
}

export function AdminAgendaCopyPanel() {
  const [form, setForm] = useState<AgendaCopyForm>(EMPTY_FORM);
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
      setError(body?.error ?? "No se pudo cargar la sección de agenda.");
      setLoading(false);
      return;
    }
    setForm(normalizeForm(body.settings));
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const onChange = (key: keyof AgendaCopyForm, value: string) => {
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
    setSuccess("Sección de agenda actualizada.");
    setSaving(false);
  };

  if (loading) {
    return <p className="text-sm text-slate-600 dark:text-slate-300">Cargando sección de agenda...</p>;
  }

  return (
    <div className="space-y-4">
      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Homepage CMS</p>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Agenda</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">Textos de apoyo del bloque de agendamiento.</p>
      </section>

      <div className="grid gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-surface-muted/80 dark:bg-surface-elevated/80 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Título</span>
          <input className="input h-11 text-sm" value={form.bookingTitle} onChange={(e) => onChange("bookingTitle", e.target.value)} disabled={saving} />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Título beneficios</span>
          <input className="input h-11 text-sm" value={form.bookingBenefitsTitle} onChange={(e) => onChange("bookingBenefitsTitle", e.target.value)} disabled={saving} />
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Descripción</span>
          <textarea className="input min-h-28 text-sm" value={form.bookingDescription} onChange={(e) => onChange("bookingDescription", e.target.value)} disabled={saving} />
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Nota de horario</span>
          <textarea className="input min-h-28 text-sm" value={form.bookingScheduleNote} onChange={(e) => onChange("bookingScheduleNote", e.target.value)} disabled={saving} />
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Nota de consentimiento</span>
          <textarea className="input min-h-28 text-sm" value={form.bookingConsentNote} onChange={(e) => onChange("bookingConsentNote", e.target.value)} disabled={saving} />
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
