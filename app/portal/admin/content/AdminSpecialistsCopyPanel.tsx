"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";
import { AdminImageField } from "@/app/portal/admin/content/components/AdminImageField";

type SpecialistsCopyForm = {
  specialistsBadge: string;
  specialistsTitle: string;
  specialistsDescription: string;
};

const EMPTY_FORM: SpecialistsCopyForm = { specialistsBadge: "", specialistsTitle: "", specialistsDescription: "" };

type SettingsApiResponse = {
  settings?: Partial<Record<keyof SpecialistsCopyForm, string | null>>;
  error?: string;
  details?: Array<{ path: string; message: string }>;
};

type ProfessionalRecord = {
  id: string;
  userId: string;
  user: { name: string; lastName: string };
  specialty?: { name: string } | null;
  homepageBioShort?: string | null;
  homepageImageUrl?: string | null;
  homepageImageAlt?: string | null;
  showOnHomepage: boolean;
  homepageSortOrder: number;
};

export function AdminSpecialistsCopyPanel() {
  const [form, setForm] = useState<SpecialistsCopyForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [professionals, setProfessionals] = useState<ProfessionalRecord[]>([]);
  const [professionalsLoading, setProfessionalsLoading] = useState(true);
  const [rowSaving, setRowSaving] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ bio: string; imageUrl: string; imageAlt: string; sortOrder: string }>({
    bio: "",
    imageUrl: "",
    imageAlt: "",
    sortOrder: "0",
  });

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await fetchWithRetry("/api/admin/homepage/settings");
    const body = (await response.json().catch(() => null)) as SettingsApiResponse | null;
    if (!response.ok || !body?.settings) {
      setError(body?.error ?? "No se pudo cargar el encabezado de especialistas.");
      setLoading(false);
      return;
    }
    setForm({
      specialistsBadge: body.settings.specialistsBadge ?? "",
      specialistsTitle: body.settings.specialistsTitle ?? "",
      specialistsDescription: body.settings.specialistsDescription ?? "",
    });
    setLoading(false);
  }, []);

  const loadProfessionals = useCallback(async () => {
    setProfessionalsLoading(true);
    setRowError(null);
    // NOTE: 50 is /api/professionals's MAX_PAGE_SIZE. The real team is a handful of
    // specialists, so a single page covers it for a long time.
    const response = await fetchWithRetry("/api/professionals?pageSize=50");
    if (response.ok) {
      const data = (await response.json()) as { data: ProfessionalRecord[] };
      setProfessionals(data.data ?? []);
    } else {
      // Without this the empty-list branch renders and reads as "no professionals exist".
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setRowError(body?.error ?? "No se pudo cargar el equipo. Intenta recargar la página.");
      setProfessionals([]);
    }
    setProfessionalsLoading(false);
  }, []);

  useEffect(() => {
    void loadSettings();
    void loadProfessionals();
  }, [loadSettings, loadProfessionals]);

  const onSaveHeader = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    const response = await fetchWithTimeout("/api/admin/homepage/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = (await response.json().catch(() => null)) as SettingsApiResponse | null;
    if (!response.ok) {
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudieron guardar los cambios.");
      setSaving(false);
      return;
    }
    setSuccess("Encabezado de especialistas actualizado.");
    setSaving(false);
  };

  const toggleShowOnHomepage = async (professional: ProfessionalRecord, next: boolean) => {
    setRowSaving(professional.userId);
    setRowError(null);
    const response = await fetchWithTimeout(`/api/users/${professional.userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showOnHomepage: next }),
    });
    if (response.ok) {
      setProfessionals((prev) => prev.map((p) => (p.userId === professional.userId ? { ...p, showOnHomepage: next } : p)));
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setRowError(body?.error ?? "No se pudo actualizar.");
    }
    setRowSaving(null);
  };

  const openEditor = (professional: ProfessionalRecord) => {
    if (expandedUserId === professional.userId) {
      setExpandedUserId(null);
      return;
    }
    setExpandedUserId(professional.userId);
    setDraft({
      bio: professional.homepageBioShort ?? "",
      imageUrl: professional.homepageImageUrl ?? "",
      imageAlt: professional.homepageImageAlt ?? "",
      sortOrder: String(professional.homepageSortOrder ?? 0),
    });
  };

  const saveDraft = async (professional: ProfessionalRecord) => {
    setRowSaving(professional.userId);
    setRowError(null);
    const response = await fetchWithTimeout(`/api/users/${professional.userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        homepageBioShort: draft.bio,
        homepageImageUrl: draft.imageUrl,
        homepageImageAlt: draft.imageAlt,
        homepageSortOrder: Number(draft.sortOrder) || 0,
      }),
    });
    if (response.ok) {
      setProfessionals((prev) =>
        prev.map((p) =>
          p.userId === professional.userId
            ? { ...p, homepageBioShort: draft.bio, homepageImageUrl: draft.imageUrl, homepageImageAlt: draft.imageAlt, homepageSortOrder: Number(draft.sortOrder) || 0 }
            : p,
        ),
      );
      setExpandedUserId(null);
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setRowError(body?.error ?? "No se pudo guardar.");
    }
    setRowSaving(null);
  };

  if (loading) {
    return <p className="text-sm text-slate-600 dark:text-slate-300">Cargando equipo...</p>;
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Homepage CMS</p>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Equipo</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Badge, título y descripción del bloque de especialistas, y quién se muestra en el sitio público. Rol y
          especialidad se editan en Usuarios.
        </p>
      </section>

      <div className="grid gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-surface-muted/80 dark:bg-surface-elevated/80 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Badge (eyebrow)</span>
          <input
            className="input h-11 text-sm"
            placeholder="EQUIPO CLÍNICO"
            value={form.specialistsBadge}
            onChange={(e) => setForm((p) => ({ ...p, specialistsBadge: e.target.value }))}
            disabled={saving}
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Título</span>
          <input className="input h-11 text-sm" value={form.specialistsTitle} onChange={(e) => setForm((p) => ({ ...p, specialistsTitle: e.target.value }))} disabled={saving} />
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Descripción</span>
          <textarea className="input min-h-28 text-sm" value={form.specialistsDescription} onChange={(e) => setForm((p) => ({ ...p, specialistsDescription: e.target.value }))} disabled={saving} />
        </label>
      </div>

      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p> : null}

      <button
        type="button"
        className="rounded-full bg-brand-teal px-5 py-2 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => void onSaveHeader()}
        disabled={saving}
      >
        {saving ? "Guardando..." : "Guardar encabezado"}
      </button>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Equipo en el sitio público
        </h3>

        {rowError ? <p className="text-sm text-red-600 dark:text-red-400">{rowError}</p> : null}

        {professionalsLoading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Cargando equipo...</p>
        ) : professionals.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-surface-muted">
            No hay profesionales registrados. Crea uno desde Usuarios.
          </p>
        ) : (
          <div className="space-y-3">
            {professionals.map((professional) => (
              <div key={professional.userId} className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-surface-muted/80 dark:bg-surface-elevated/80">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {professional.user.name} {professional.user.lastName}
                    </p>
                    {professional.specialty?.name ? <p className="text-xs text-slate-400">{professional.specialty.name}</p> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <input
                        type="checkbox"
                        checked={professional.showOnHomepage}
                        onChange={(e) => void toggleShowOnHomepage(professional, e.target.checked)}
                        disabled={rowSaving === professional.userId}
                      />
                      Mostrar en el sitio público
                    </label>
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-surface-muted dark:text-slate-200"
                      onClick={() => openEditor(professional)}
                    >
                      {expandedUserId === professional.userId ? "Cerrar" : "Editar"}
                    </button>
                  </div>
                </div>

                {expandedUserId === professional.userId ? (
                  <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-surface-muted">
                    <textarea
                      className="input min-h-24 text-sm"
                      placeholder="Bio corta para el sitio público"
                      value={draft.bio}
                      onChange={(e) => setDraft((p) => ({ ...p, bio: e.target.value }))}
                      maxLength={600}
                      disabled={rowSaving === professional.userId}
                    />
                    <AdminImageField
                      label="Imagen para el sitio público"
                      value={draft.imageUrl}
                      onChange={(value) => setDraft((p) => ({ ...p, imageUrl: value }))}
                      uploadFolder="marketing/specialists"
                      recommendation="1200x1500 px"
                      aspectRatio="4:5"
                      placeholder="https://..."
                      disabled={rowSaving === professional.userId}
                    />
                    <input
                      className="input h-11 text-sm"
                      placeholder="Texto alternativo de la imagen"
                      value={draft.imageAlt}
                      onChange={(e) => setDraft((p) => ({ ...p, imageAlt: e.target.value }))}
                      maxLength={180}
                      disabled={rowSaving === professional.userId}
                    />
                    <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Orden
                      <input
                        type="number"
                        min={0}
                        className="input h-9 w-20 text-sm"
                        value={draft.sortOrder}
                        onChange={(e) => setDraft((p) => ({ ...p, sortOrder: e.target.value }))}
                        disabled={rowSaving === professional.userId}
                      />
                    </label>
                    <button
                      type="button"
                      className="rounded-full bg-brand-teal px-3 py-1.5 text-xs font-semibold uppercase text-white disabled:opacity-60"
                      onClick={() => void saveDraft(professional)}
                      disabled={rowSaving === professional.userId}
                    >
                      {rowSaving === professional.userId ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
