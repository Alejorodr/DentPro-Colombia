"use client";

import { useCallback, useEffect, useState } from "react";

import type { MarketingIconKey } from "@/lib/marketing/homepage-types";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";
import { IconSelect } from "@/app/portal/admin/content/components/IconSelect";

type ServicesCopyForm = {
  servicesTitle: string;
  servicesDescription: string;
};

const EMPTY_FORM: ServicesCopyForm = { servicesTitle: "", servicesDescription: "" };

type SettingsApiResponse = {
  settings?: Partial<Record<keyof ServicesCopyForm, string | null>>;
  error?: string;
  details?: Array<{ path: string; message: string }>;
};

type ServiceRecord = {
  id: string;
  name: string;
  description?: string | null;
  active: boolean;
  iconKey?: string | null;
  showOnHomepage: boolean;
  homepageSortOrder: number;
};

type HighlightItem = { id: string; text: string; sortOrder: number };

export function AdminServicesCopyPanel() {
  const [form, setForm] = useState<ServicesCopyForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [rowSaving, setRowSaving] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(false);
  const [newHighlightText, setNewHighlightText] = useState("");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await fetchWithRetry("/api/admin/homepage/settings");
    const body = (await response.json().catch(() => null)) as SettingsApiResponse | null;
    if (!response.ok || !body?.settings) {
      setError(body?.error ?? "No se pudo cargar el encabezado de servicios.");
      setLoading(false);
      return;
    }
    setForm({
      servicesTitle: body.settings.servicesTitle ?? "",
      servicesDescription: body.settings.servicesDescription ?? "",
    });
    setLoading(false);
  }, []);

  const loadServices = useCallback(async () => {
    setServicesLoading(true);
    const response = await fetchWithRetry("/api/services?pageSize=100");
    if (response.ok) {
      const data = (await response.json()) as { data: ServiceRecord[] };
      setServices(data.data ?? []);
    }
    setServicesLoading(false);
  }, []);

  useEffect(() => {
    void loadSettings();
    void loadServices();
  }, [loadSettings, loadServices]);

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
    setSuccess("Encabezado de servicios actualizado.");
    setSaving(false);
  };

  const patchService = async (id: string, patch: Partial<Pick<ServiceRecord, "iconKey" | "showOnHomepage" | "homepageSortOrder">>) => {
    setRowSaving(id);
    setRowError(null);
    const response = await fetchWithTimeout(`/api/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (response.ok) {
      setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setRowError(body?.error ?? "No se pudo actualizar el servicio.");
    }
    setRowSaving(null);
  };

  const loadHighlights = useCallback(async (serviceId: string) => {
    setHighlightsLoading(true);
    const response = await fetchWithRetry(`/api/services/${serviceId}/highlights`);
    if (response.ok) {
      const data = (await response.json()) as { highlights: HighlightItem[] };
      setHighlights(data.highlights ?? []);
    }
    setHighlightsLoading(false);
  }, []);

  const toggleExpanded = (service: ServiceRecord) => {
    if (expandedId === service.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(service.id);
    setNewHighlightText("");
    setHighlights([]);
    void loadHighlights(service.id);
  };

  const createHighlight = async (serviceId: string) => {
    const text = newHighlightText.trim();
    if (!text) return;
    setRowSaving(serviceId);
    const response = await fetchWithTimeout(`/api/services/${serviceId}/highlights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (response.ok) {
      setNewHighlightText("");
      await loadHighlights(serviceId);
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setRowError(body?.error ?? "No se pudo crear el highlight.");
    }
    setRowSaving(null);
  };

  const deleteHighlight = async (serviceId: string, highlightId: string) => {
    setRowSaving(serviceId);
    const response = await fetchWithTimeout(`/api/services/${serviceId}/highlights/${highlightId}`, { method: "DELETE" });
    if (response.ok) {
      await loadHighlights(serviceId);
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setRowError(body?.error ?? "No se pudo eliminar el highlight.");
    }
    setRowSaving(null);
  };

  if (loading) {
    return <p className="text-sm text-slate-600 dark:text-slate-300">Cargando servicios...</p>;
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Homepage CMS</p>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Servicios</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Título y descripción de la sección &ldquo;¿Qué hacemos?&rdquo;, y qué servicios reales se muestran ahí. Nombre,
          precio y duración se editan en Servicios y tarifas.
        </p>
      </section>

      <div className="grid gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-surface-muted/80 dark:bg-surface-elevated/80 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Título</span>
          <input className="input h-11 text-sm" value={form.servicesTitle} onChange={(e) => setForm((p) => ({ ...p, servicesTitle: e.target.value }))} disabled={saving} />
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Descripción</span>
          <textarea className="input min-h-28 text-sm" value={form.servicesDescription} onChange={(e) => setForm((p) => ({ ...p, servicesDescription: e.target.value }))} disabled={saving} />
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
          Servicios en el sitio público
        </h3>

        {rowError ? <p className="text-sm text-red-600 dark:text-red-400">{rowError}</p> : null}

        {servicesLoading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Cargando servicios...</p>
        ) : services.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-surface-muted">
            No hay servicios registrados. Creá uno desde Servicios y tarifas.
          </p>
        ) : (
          <div className="space-y-3">
            {services.map((service) => (
              <div key={service.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-surface-muted/80 dark:bg-surface-elevated/80">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{service.name}</p>
                    {service.description ? <p className="text-xs text-slate-400">{service.description}</p> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <input
                        type="checkbox"
                        checked={service.showOnHomepage}
                        onChange={(e) => void patchService(service.id, { showOnHomepage: e.target.checked })}
                        disabled={rowSaving === service.id}
                      />
                      Mostrar en el sitio público
                    </label>
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-surface-muted dark:text-slate-200"
                      onClick={() => toggleExpanded(service)}
                    >
                      {expandedId === service.id ? "Cerrar" : "Editar"}
                    </button>
                  </div>
                </div>

                {expandedId === service.id ? (
                  <div className="mt-4 space-y-4 border-t border-slate-100 pt-4 dark:border-surface-muted">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Ícono
                        <div className="mt-2">
                          <IconSelect
                            value={(service.iconKey ?? "") as MarketingIconKey | ""}
                            onChange={(next) => void patchService(service.id, { iconKey: next })}
                            disabled={rowSaving === service.id}
                            allowEmpty
                          />
                        </div>
                      </label>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Orden en el sitio público
                        <input
                          className="input mt-2 h-11 text-sm"
                          type="number"
                          min={0}
                          value={service.homepageSortOrder}
                          onChange={(e) => void patchService(service.id, { homepageSortOrder: Number(e.target.value) || 0 })}
                          disabled={rowSaving === service.id}
                        />
                      </label>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Highlights</p>
                      {highlightsLoading ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Cargando highlights...</p>
                      ) : (
                        <>
                          {highlights.map((h) => (
                            <div key={h.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-surface-muted">
                              <span>{h.text}</span>
                              <button
                                type="button"
                                className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600"
                                onClick={() => void deleteHighlight(service.id, h.id)}
                                disabled={rowSaving === service.id}
                              >
                                Eliminar
                              </button>
                            </div>
                          ))}
                          <div className="flex gap-2">
                            <input
                              className="input h-10 flex-1 text-sm"
                              placeholder="Nuevo highlight"
                              value={newHighlightText}
                              onChange={(e) => setNewHighlightText(e.target.value)}
                              disabled={rowSaving === service.id}
                            />
                            <button
                              type="button"
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-surface-muted dark:text-slate-200"
                              onClick={() => void createHighlight(service.id)}
                              disabled={rowSaving === service.id}
                            >
                              Agregar
                            </button>
                          </div>
                        </>
                      )}
                    </div>
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
