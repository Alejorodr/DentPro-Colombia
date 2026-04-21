"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Card } from "@/app/portal/components/ui/Card";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";
import { MARKETING_ICON_KEYS } from "@/lib/marketing/homepage-types";

type HighlightItem = { id: string; text: string; sortOrder: number };
type ServiceItem = {
  id: string;
  title: string;
  description: string;
  iconKey: (typeof MARKETING_ICON_KEYS)[number];
  sortOrder: number;
  isActive: boolean;
  highlights: HighlightItem[];
};

type ServicesApiResponse = {
  services?: ServiceItem[];
  service?: ServiceItem;
  error?: string;
  details?: Array<{ path: string; message: string }>;
};

const EMPTY_SERVICE_FORM = {
  title: "",
  description: "",
  iconKey: "Sparkle" as (typeof MARKETING_ICON_KEYS)[number],
  isActive: true,
};

export function AdminHomepageServicesPanel() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [newService, setNewService] = useState(EMPTY_SERVICE_FORM);
  const [newHighlightText, setNewHighlightText] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await fetchWithRetry("/api/admin/homepage/services");
    const body = (await response.json().catch(() => null)) as ServicesApiResponse | null;

    if (!response.ok || !body?.services) {
      setError(body?.error ?? "No se pudieron cargar los servicios del homepage.");
      setLoading(false);
      return;
    }

    setServices(body.services);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  const validationMessage = useMemo(() => error, [error]);

  const updateService = async (serviceId: string, payload: Partial<ServiceItem>) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const response = await fetchWithTimeout(`/api/admin/homepage/services/${serviceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = (await response.json().catch(() => null)) as ServicesApiResponse | null;

    if (!response.ok || !body?.service) {
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudo actualizar el servicio.");
      setSaving(false);
      return;
    }

    setServices((prev) => prev.map((item) => (item.id === serviceId ? body.service! : item)).sort((a, b) => a.sortOrder - b.sortOrder));
    setSuccess("Servicio actualizado.");
    setSaving(false);
  };

  const createService = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const response = await fetchWithTimeout("/api/admin/homepage/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newService),
    });

    const body = (await response.json().catch(() => null)) as ServicesApiResponse | null;

    if (!response.ok || !body?.service) {
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudo crear el servicio.");
      setSaving(false);
      return;
    }

    setServices((prev) => [...prev, body.service!].sort((a, b) => a.sortOrder - b.sortOrder));
    setNewService(EMPTY_SERVICE_FORM);
    setSuccess("Servicio creado.");
    setSaving(false);
  };

  const removeService = async (service: ServiceItem) => {
    if (!window.confirm(`¿Eliminar el servicio \"${service.title}\"?`)) return;

    setSaving(true);
    setError(null);
    const response = await fetchWithTimeout(`/api/admin/homepage/services/${service.id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as ServicesApiResponse | null;
      setError(body?.error ?? "No se pudo eliminar el servicio.");
      setSaving(false);
      return;
    }
    await loadServices();
    setSaving(false);
    setSuccess("Servicio eliminado.");
  };

  const reorderServices = async (sourceIndex: number, targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= services.length) return;

    const ordered = [...services];
    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, moved);

    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout("/api/admin/homepage/services/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: ordered.map((item) => item.id) }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No se pudo reordenar.");
      setSaving(false);
      return;
    }

    setServices(ordered.map((item, index) => ({ ...item, sortOrder: index })));
    setSaving(false);
  };

  const createHighlight = async (serviceId: string) => {
    const text = (newHighlightText[serviceId] ?? "").trim();
    if (!text) {
      setError("El texto del highlight es obligatorio.");
      return;
    }

    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout(`/api/admin/homepage/services/${serviceId}/highlights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as ServicesApiResponse | null;
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudo crear el highlight.");
      setSaving(false);
      return;
    }

    setNewHighlightText((prev) => ({ ...prev, [serviceId]: "" }));
    await loadServices();
    setSaving(false);
  };

  const updateHighlight = async (serviceId: string, highlightId: string, text: string) => {
    setSaving(true);
    setError(null);
    const response = await fetchWithTimeout(`/api/admin/homepage/services/${serviceId}/highlights/${highlightId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as ServicesApiResponse | null;
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudo editar el highlight.");
      setSaving(false);
      return;
    }

    await loadServices();
    setSaving(false);
  };

  const deleteHighlight = async (serviceId: string, highlightId: string) => {
    setSaving(true);
    setError(null);
    const response = await fetchWithTimeout(`/api/admin/homepage/services/${serviceId}/highlights/${highlightId}`, { method: "DELETE" });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as ServicesApiResponse | null;
      setError(body?.error ?? "No se pudo eliminar el highlight.");
      setSaving(false);
      return;
    }
    await loadServices();
    setSaving(false);
  };

  const reorderHighlights = async (service: ServiceItem, sourceIndex: number, targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= service.highlights.length) return;

    const ordered = [...service.highlights];
    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, moved);

    setSaving(true);
    const response = await fetchWithTimeout(`/api/admin/homepage/services/${service.id}/highlights/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: ordered.map((item) => item.id) }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No se pudo reordenar highlights.");
      setSaving(false);
      return;
    }

    await loadServices();
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Homepage CMS</p>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Servicios del homepage</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">Fase 3B: CRUD y orden para servicios + highlights.</p>
      </section>

      <Card className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Nuevo servicio</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <input className="input h-11 text-sm" placeholder="Título" value={newService.title} onChange={(e) => setNewService((p) => ({ ...p, title: e.target.value }))} disabled={saving} />
          <select className="input h-11 text-sm" value={newService.iconKey} onChange={(e) => setNewService((p) => ({ ...p, iconKey: e.target.value as (typeof MARKETING_ICON_KEYS)[number] }))} disabled={saving}>
            {MARKETING_ICON_KEYS.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
          </select>
          <textarea className="input min-h-24 text-sm md:col-span-2" placeholder="Descripción" value={newService.description} onChange={(e) => setNewService((p) => ({ ...p, description: e.target.value }))} disabled={saving} />
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <input type="checkbox" checked={newService.isActive} onChange={(e) => setNewService((p) => ({ ...p, isActive: e.target.checked }))} disabled={saving} /> Activo
          </label>
        </div>
        <button type="button" className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-60" onClick={createService} disabled={saving}>
          Crear servicio
        </button>
      </Card>

      {loading ? <Card><p className="text-sm text-slate-600 dark:text-slate-300">Cargando servicios...</p></Card> : null}

      {services.map((service, index) => (
        <Card key={service.id} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{service.title}</h3>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => reorderServices(index, index - 1)} disabled={saving || index === 0}>Subir</button>
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => reorderServices(index, index + 1)} disabled={saving || index === services.length - 1}>Bajar</button>
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => setEditingId((prev) => (prev === service.id ? null : service.id))} disabled={saving}>{editingId === service.id ? "Cerrar" : "Editar"}</button>
              <button type="button" className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-700" onClick={() => removeService(service)} disabled={saving}>Eliminar</button>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">Orden #{service.sortOrder + 1} · {service.isActive ? "Activo" : "Inactivo"} · Icono: {service.iconKey}</p>

          {editingId === service.id ? (
            <div className="grid gap-3 md:grid-cols-2">
              <input className="input h-11 text-sm" value={service.title} onChange={(e) => setServices((prev) => prev.map((item) => (item.id === service.id ? { ...item, title: e.target.value } : item)))} disabled={saving} />
              <select className="input h-11 text-sm" value={service.iconKey} onChange={(e) => setServices((prev) => prev.map((item) => (item.id === service.id ? { ...item, iconKey: e.target.value as (typeof MARKETING_ICON_KEYS)[number] } : item)))} disabled={saving}>
                {MARKETING_ICON_KEYS.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
              </select>
              <textarea className="input min-h-24 text-sm md:col-span-2" value={service.description} onChange={(e) => setServices((prev) => prev.map((item) => (item.id === service.id ? { ...item, description: e.target.value } : item)))} disabled={saving} />
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <input type="checkbox" checked={service.isActive} onChange={(e) => setServices((prev) => prev.map((item) => (item.id === service.id ? { ...item, isActive: e.target.checked } : item)))} disabled={saving} /> Activo
              </label>
              <button type="button" className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-60 md:justify-self-start" onClick={() => updateService(service.id, { title: service.title, description: service.description, iconKey: service.iconKey, isActive: service.isActive })} disabled={saving}>
                Guardar servicio
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">{service.description}</p>
          )}

          <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-surface-muted">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Highlights</p>
            {service.highlights.map((highlight, highlightIndex) => (
              <div key={highlight.id} className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
                <input
                  className="input h-10 text-sm"
                  value={highlight.text}
                  onChange={(e) =>
                    setServices((prev) =>
                      prev.map((item) =>
                        item.id === service.id
                          ? {
                              ...item,
                              highlights: item.highlights.map((candidate) =>
                                candidate.id === highlight.id ? { ...candidate, text: e.target.value } : candidate,
                              ),
                            }
                          : item,
                      ),
                    )
                  }
                  disabled={saving}
                />
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => reorderHighlights(service, highlightIndex, highlightIndex - 1)} disabled={saving || highlightIndex === 0}>Subir</button>
                  <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => reorderHighlights(service, highlightIndex, highlightIndex + 1)} disabled={saving || highlightIndex === service.highlights.length - 1}>Bajar</button>
                  <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => updateHighlight(service.id, highlight.id, highlight.text)} disabled={saving}>Guardar</button>
                  <button type="button" className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-700" onClick={() => deleteHighlight(service.id, highlight.id)} disabled={saving}>Eliminar</button>
                </div>
              </div>
            ))}

            <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
              <input className="input h-10 text-sm" placeholder="Nuevo highlight" value={newHighlightText[service.id] ?? ""} onChange={(e) => setNewHighlightText((prev) => ({ ...prev, [service.id]: e.target.value }))} disabled={saving} />
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => createHighlight(service.id)} disabled={saving}>Agregar highlight</button>
            </div>
          </div>
        </Card>
      ))}

      {validationMessage ? <p className="text-sm text-red-600">{validationMessage}</p> : null}
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
    </div>
  );
}
