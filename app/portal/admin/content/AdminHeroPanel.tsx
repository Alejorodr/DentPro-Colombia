"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminImageField } from "@/app/portal/admin/content/components/AdminImageField";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

type HeroForm = {
  heroBadge: string;
  heroTitle: string;
  heroDescription: string;
  heroPrimaryButtonText: string;
  heroPrimaryButtonHref: string;
  heroSecondaryButtonText: string;
  heroSecondaryButtonHref: string;
  heroImageUrl: string;
  heroImageAlt: string;
  heroTestimonialQuote: string;
  heroTestimonialAuthor: string;
  heroTestimonialRole: string;
  heroTestimonialAvatarUrl: string;
  heroHighlightTitle: string;
  heroHighlightDescription: string;
};

const EMPTY_FORM: HeroForm = {
  heroBadge: "",
  heroTitle: "",
  heroDescription: "",
  heroPrimaryButtonText: "",
  heroPrimaryButtonHref: "",
  heroSecondaryButtonText: "",
  heroSecondaryButtonHref: "",
  heroImageUrl: "",
  heroImageAlt: "",
  heroTestimonialQuote: "",
  heroTestimonialAuthor: "",
  heroTestimonialRole: "",
  heroTestimonialAvatarUrl: "",
  heroHighlightTitle: "",
  heroHighlightDescription: "",
};

type ApiResponse = {
  settings?: Partial<Record<keyof HeroForm, string | null>>;
  error?: string;
  details?: Array<{ path: string; message: string }>;
};

function normalizeForm(input: Partial<Record<keyof HeroForm, string | null>>): HeroForm {
  const output = { ...EMPTY_FORM };
  for (const key of Object.keys(output) as Array<keyof HeroForm>) {
    output[key] = input[key] ?? "";
  }
  return output;
}

export function AdminHeroPanel() {
  const [form, setForm] = useState<HeroForm>(EMPTY_FORM);
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
      setError(body?.error ?? "No se pudo cargar el hero principal.");
      setLoading(false);
      return;
    }
    setForm(normalizeForm(body.settings));
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const onChange = (key: keyof HeroForm, value: string) => {
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
    setSuccess("Hero principal actualizado.");
    setSaving(false);
  };

  if (loading) {
    return <p className="text-sm text-slate-600 dark:text-slate-300">Cargando hero principal...</p>;
  }

  return (
    <div className="space-y-4">
      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Homepage CMS</p>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Hero principal</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Título, descripción, botones, testimonio e imagen principal del hero.
        </p>
      </section>

      <div className="grid gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-surface-muted/80 dark:bg-surface-elevated/80 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Badge</span>
          <input className="input h-11 text-sm" value={form.heroBadge} onChange={(e) => onChange("heroBadge", e.target.value)} disabled={saving} />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Título</span>
          <input className="input h-11 text-sm" value={form.heroTitle} onChange={(e) => onChange("heroTitle", e.target.value)} disabled={saving} />
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Descripción</span>
          <textarea className="input min-h-28 text-sm" value={form.heroDescription} onChange={(e) => onChange("heroDescription", e.target.value)} disabled={saving} />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Botón primario (texto)</span>
          <input className="input h-11 text-sm" value={form.heroPrimaryButtonText} onChange={(e) => onChange("heroPrimaryButtonText", e.target.value)} disabled={saving} />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Botón primario (href)</span>
          <input className="input h-11 text-sm" placeholder="#agenda o https://..." value={form.heroPrimaryButtonHref} onChange={(e) => onChange("heroPrimaryButtonHref", e.target.value)} disabled={saving} />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Botón secundario (texto)</span>
          <input className="input h-11 text-sm" value={form.heroSecondaryButtonText} onChange={(e) => onChange("heroSecondaryButtonText", e.target.value)} disabled={saving} />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Botón secundario (href)</span>
          <input className="input h-11 text-sm" placeholder="#agenda o https://..." value={form.heroSecondaryButtonHref} onChange={(e) => onChange("heroSecondaryButtonHref", e.target.value)} disabled={saving} />
        </label>

        <AdminImageField
          label="URL imagen hero"
          value={form.heroImageUrl}
          onChange={(value) => onChange("heroImageUrl", value)}
          uploadFolder="marketing/homepage/hero"
          recommendation="1200×900 px"
          aspectRatio="4:3"
          placeholder="https://..."
          disabled={saving}
        />

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Alt imagen hero</span>
          <input className="input h-11 text-sm" value={form.heroImageAlt} onChange={(e) => onChange("heroImageAlt", e.target.value)} disabled={saving} />
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Testimonio (quote)</span>
          <textarea className="input min-h-28 text-sm" value={form.heroTestimonialQuote} onChange={(e) => onChange("heroTestimonialQuote", e.target.value)} disabled={saving} />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Testimonio (autor)</span>
          <input className="input h-11 text-sm" value={form.heroTestimonialAuthor} onChange={(e) => onChange("heroTestimonialAuthor", e.target.value)} disabled={saving} />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Testimonio (rol)</span>
          <input className="input h-11 text-sm" value={form.heroTestimonialRole} onChange={(e) => onChange("heroTestimonialRole", e.target.value)} disabled={saving} />
        </label>

        <AdminImageField
          label="URL avatar testimonio"
          value={form.heroTestimonialAvatarUrl}
          onChange={(value) => onChange("heroTestimonialAvatarUrl", value)}
          uploadFolder="marketing/homepage/testimonial"
          recommendation="400×400 px"
          aspectRatio="1:1"
          placeholder="https://..."
          disabled={saving}
        />

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Highlight título</span>
          <input className="input h-11 text-sm" value={form.heroHighlightTitle} onChange={(e) => onChange("heroHighlightTitle", e.target.value)} disabled={saving} />
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Highlight descripción</span>
          <textarea className="input min-h-28 text-sm" value={form.heroHighlightDescription} onChange={(e) => onChange("heroHighlightDescription", e.target.value)} disabled={saving} />
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
