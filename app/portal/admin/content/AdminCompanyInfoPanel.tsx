"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminImageField } from "@/app/portal/admin/content/components/AdminImageField";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

type CompanyInfoForm = {
  siteName: string;
  logoUrl: string;
  infoBarLocation: string;
  infoBarHours: string;
};

const EMPTY_FORM: CompanyInfoForm = { siteName: "", logoUrl: "", infoBarLocation: "", infoBarHours: "" };

export function AdminCompanyInfoPanel() {
  const [form, setForm] = useState<CompanyInfoForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await fetchWithRetry("/api/admin/homepage/settings");
    const body = (await response.json().catch(() => null)) as { settings?: Partial<CompanyInfoForm> } | null;
    if (!response.ok || !body?.settings) {
      setError("No se pudo cargar la información de empresa.");
      setLoading(false);
      return;
    }
    setForm({
      siteName: body.settings.siteName ?? "",
      logoUrl: body.settings.logoUrl ?? "",
      infoBarLocation: body.settings.infoBarLocation ?? "",
      infoBarHours: body.settings.infoBarHours ?? "",
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    const response = await fetchWithTimeout("/api/admin/homepage/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = (await response.json().catch(() => null)) as { error?: string; details?: Array<{ message: string }> } | null;
    if (!response.ok) {
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudieron guardar los cambios.");
      setSaving(false);
      return;
    }
    setSuccess("Información de empresa actualizada.");
    setSaving(false);
  };

  if (loading) {
    return <p className="text-sm text-slate-600 dark:text-slate-300">Cargando información de empresa...</p>;
  }

  return (
    <div className="space-y-4">
      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Homepage CMS</p>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Información de empresa</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">Nombre, logo, dirección y horario — se muestran automáticamente en el sitio donde ya aparecen hoy.</p>
      </section>

      <div className="grid gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-surface-muted/80 dark:bg-surface-elevated/80 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Nombre de la empresa</span>
          <input className="input h-11 text-sm" value={form.siteName} onChange={(e) => setForm((p) => ({ ...p, siteName: e.target.value }))} disabled={saving} />
        </label>
        <AdminImageField
          label="Logo"
          value={form.logoUrl}
          onChange={(value) => setForm((p) => ({ ...p, logoUrl: value }))}
          uploadFolder="marketing/homepage/testimonial"
          recommendation="200×200 px mínimo"
          aspectRatio="1:1"
          placeholder="https://..."
          disabled={saving}
        />
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Dirección</span>
          <input className="input h-11 text-sm" placeholder="Cra. 7 #13-180, Chía" value={form.infoBarLocation} onChange={(e) => setForm((p) => ({ ...p, infoBarLocation: e.target.value }))} disabled={saving} />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Horario</span>
          <input className="input h-11 text-sm" placeholder="Lun–Sáb 8:00-19:00" value={form.infoBarHours} onChange={(e) => setForm((p) => ({ ...p, infoBarHours: e.target.value }))} disabled={saving} />
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
