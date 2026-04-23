"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Card } from "@/app/portal/components/ui/Card";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

type LocationItem = {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
};

type LocationsApiResponse = {
  locations?: LocationItem[];
  location?: LocationItem;
  error?: string;
  details?: Array<{ path: string; message: string }>;
};

const EMPTY_LOCATION = {
  name: "",
  description: "",
  isActive: true,
};

export function AdminHomepageLocationsPanel() {
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [newLocation, setNewLocation] = useState(EMPTY_LOCATION);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadLocations = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await fetchWithRetry("/api/admin/homepage/locations");
    const body = (await response.json().catch(() => null)) as LocationsApiResponse | null;

    if (!response.ok || !body?.locations) {
      setError(body?.error ?? "No se pudieron cargar las sedes.");
      setLoading(false);
      return;
    }

    setLocations(body.locations);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  const validationMessage = useMemo(() => error, [error]);

  const createLocation = async () => {
    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout("/api/admin/homepage/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newLocation),
    });

    const body = (await response.json().catch(() => null)) as LocationsApiResponse | null;

    if (!response.ok || !body?.location) {
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudo crear la sede.");
      setSaving(false);
      return;
    }

    setLocations((prev) => [...prev, body.location!].sort((a, b) => a.sortOrder - b.sortOrder));
    setNewLocation(EMPTY_LOCATION);
    setSaving(false);
    setSuccess("Sede creada.");
  };

  const saveLocation = async (location: LocationItem) => {
    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout(`/api/admin/homepage/locations/${location.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: location.name,
        description: location.description,
        isActive: location.isActive,
      }),
    });

    const body = (await response.json().catch(() => null)) as LocationsApiResponse | null;

    if (!response.ok || !body?.location) {
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudo guardar la sede.");
      setSaving(false);
      return;
    }

    setLocations((prev) => prev.map((item) => (item.id === location.id ? body.location! : item)));
    setSaving(false);
    setSuccess("Sede actualizada.");
  };

  const removeLocation = async (location: LocationItem) => {
    if (!window.confirm(`¿Eliminar la sede "${location.name}"?`)) return;

    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout(`/api/admin/homepage/locations/${location.id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as LocationsApiResponse | null;
      setError(body?.error ?? "No se pudo eliminar la sede.");
      setSaving(false);
      return;
    }

    await loadLocations();
    setSaving(false);
    setSuccess("Sede eliminada.");
  };

  const reorderLocations = async (sourceIndex: number, targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= locations.length) return;

    const ordered = [...locations];
    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, moved);

    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout("/api/admin/homepage/locations/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: ordered.map((item) => item.id) }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No se pudo reordenar las sedes.");
      setSaving(false);
      return;
    }

    setLocations(ordered.map((item, index) => ({ ...item, sortOrder: index })));
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Homepage CMS</p>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Sedes</h2>
      </section>

      <Card className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Nueva sede</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <input className="input h-11 text-sm" placeholder="Nombre" value={newLocation.name} onChange={(e) => setNewLocation((prev) => ({ ...prev, name: e.target.value }))} disabled={saving} />
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <input type="checkbox" checked={newLocation.isActive} onChange={(e) => setNewLocation((prev) => ({ ...prev, isActive: e.target.checked }))} disabled={saving} /> Activa
          </label>
          <textarea className="input min-h-24 text-sm md:col-span-2" placeholder="Descripción" value={newLocation.description} onChange={(e) => setNewLocation((prev) => ({ ...prev, description: e.target.value }))} disabled={saving} />
        </div>
        <button type="button" className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-60" onClick={createLocation} disabled={saving}>Crear sede</button>
      </Card>

      {loading ? <Card><p className="text-sm text-slate-600 dark:text-slate-300">Cargando sedes...</p></Card> : null}

      {locations.map((location, index) => (
        <Card key={location.id} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{location.name}</h3>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => reorderLocations(index, index - 1)} disabled={saving || index === 0}>Subir</button>
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => reorderLocations(index, index + 1)} disabled={saving || index === locations.length - 1}>Bajar</button>
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => setEditingId((prev) => (prev === location.id ? null : location.id))} disabled={saving}>{editingId === location.id ? "Cerrar" : "Editar"}</button>
              <button type="button" className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-700" onClick={() => removeLocation(location)} disabled={saving}>Eliminar</button>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">Orden #{location.sortOrder + 1} · {location.isActive ? "Activa" : "Inactiva"}</p>

          {editingId === location.id ? (
            <div className="grid gap-3 md:grid-cols-2">
              <input className="input h-11 text-sm" value={location.name} onChange={(e) => setLocations((prev) => prev.map((item) => (item.id === location.id ? { ...item, name: e.target.value } : item)))} disabled={saving} />
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <input type="checkbox" checked={location.isActive} onChange={(e) => setLocations((prev) => prev.map((item) => (item.id === location.id ? { ...item, isActive: e.target.checked } : item)))} disabled={saving} /> Activa
              </label>
              <textarea className="input min-h-24 text-sm md:col-span-2" value={location.description} onChange={(e) => setLocations((prev) => prev.map((item) => (item.id === location.id ? { ...item, description: e.target.value } : item)))} disabled={saving} />
              <button type="button" className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-60 md:justify-self-start" onClick={() => saveLocation(location)} disabled={saving}>Guardar sede</button>
            </div>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">{location.description}</p>
          )}
        </Card>
      ))}

      {validationMessage ? <p className="text-sm text-red-600">{validationMessage}</p> : null}
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
    </div>
  );
}
