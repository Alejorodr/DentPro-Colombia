"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Card } from "@/app/portal/components/ui/Card";
import { AdminImageField } from "@/app/portal/admin/content/components/AdminImageField";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

type SpecialistItem = {
  id: string;
  fullName: string;
  specialty: string;
  bioShort: string;
  imageUrl: string | null;
  altText: string | null;
  sortOrder: number;
  isActive: boolean;
};

type SpecialistsApiResponse = {
  specialists?: SpecialistItem[];
  specialist?: SpecialistItem;
  error?: string;
  details?: Array<{ path: string; message: string }>;
};

const EMPTY_SPECIALIST = {
  fullName: "",
  specialty: "",
  bioShort: "",
  imageUrl: "",
  altText: "",
  isActive: true,
};

export function AdminHomepageSpecialistsPanel() {
  const [specialists, setSpecialists] = useState<SpecialistItem[]>([]);
  const [newSpecialist, setNewSpecialist] = useState(EMPTY_SPECIALIST);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSpecialists = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await fetchWithRetry("/api/admin/homepage/specialists");
    const body = (await response.json().catch(() => null)) as SpecialistsApiResponse | null;

    if (!response.ok || !body?.specialists) {
      setError(body?.error ?? "No se pudieron cargar los especialistas.");
      setLoading(false);
      return;
    }

    setSpecialists(body.specialists);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadSpecialists();
  }, [loadSpecialists]);

  const validationMessage = useMemo(() => error, [error]);

  const createSpecialist = async () => {
    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout("/api/admin/homepage/specialists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSpecialist),
    });

    const body = (await response.json().catch(() => null)) as SpecialistsApiResponse | null;

    if (!response.ok || !body?.specialist) {
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudo crear el especialista.");
      setSaving(false);
      return;
    }

    setSpecialists((prev) => [...prev, body.specialist!].sort((a, b) => a.sortOrder - b.sortOrder));
    setNewSpecialist(EMPTY_SPECIALIST);
    setSaving(false);
    setSuccess("Especialista creado.");
  };

  const saveSpecialist = async (specialist: SpecialistItem) => {
    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout(`/api/admin/homepage/specialists/${specialist.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: specialist.fullName,
        specialty: specialist.specialty,
        bioShort: specialist.bioShort,
        imageUrl: specialist.imageUrl,
        altText: specialist.altText,
        isActive: specialist.isActive,
      }),
    });

    const body = (await response.json().catch(() => null)) as SpecialistsApiResponse | null;

    if (!response.ok || !body?.specialist) {
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudo guardar el especialista.");
      setSaving(false);
      return;
    }

    setSpecialists((prev) => prev.map((item) => (item.id === specialist.id ? body.specialist! : item)));
    setSaving(false);
    setSuccess("Especialista actualizado.");
  };

  const removeSpecialist = async (specialist: SpecialistItem) => {
    if (!window.confirm(`¿Eliminar a ${specialist.fullName}?`)) return;
    setSaving(true);
    setError(null);
    const response = await fetchWithTimeout(`/api/admin/homepage/specialists/${specialist.id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as SpecialistsApiResponse | null;
      setError(body?.error ?? "No se pudo eliminar el especialista.");
      setSaving(false);
      return;
    }
    await loadSpecialists();
    setSaving(false);
  };

  const reorderSpecialists = async (sourceIndex: number, targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= specialists.length) return;

    const ordered = [...specialists];
    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, moved);

    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout("/api/admin/homepage/specialists/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: ordered.map((item) => item.id) }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No se pudo reordenar especialistas.");
      setSaving(false);
      return;
    }

    setSpecialists(ordered.map((item, index) => ({ ...item, sortOrder: index })));
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Homepage CMS</p>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Especialistas del homepage</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">CRUD, activación y orden manual de especialistas.</p>
      </section>

      <Card className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Nuevo especialista</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <input className="input h-11 text-sm" placeholder="Nombre completo" value={newSpecialist.fullName} onChange={(e) => setNewSpecialist((p) => ({ ...p, fullName: e.target.value }))} disabled={saving} />
          <input className="input h-11 text-sm" placeholder="Especialidad" value={newSpecialist.specialty} onChange={(e) => setNewSpecialist((p) => ({ ...p, specialty: e.target.value }))} disabled={saving} />
          <textarea className="input min-h-24 text-sm md:col-span-2" placeholder="Bio corta" value={newSpecialist.bioShort} onChange={(e) => setNewSpecialist((p) => ({ ...p, bioShort: e.target.value }))} disabled={saving} />
          <AdminImageField
            label="Imagen especialista"
            value={newSpecialist.imageUrl}
            onChange={(value) => setNewSpecialist((p) => ({ ...p, imageUrl: value }))}
            uploadFolder="marketing/specialists"
            recommendation="1200x1500 px"
            aspectRatio="4:5"
            placeholder="https://..."
            disabled={saving}
          />
          <input className="input h-11 text-sm" placeholder="Alt text" value={newSpecialist.altText} onChange={(e) => setNewSpecialist((p) => ({ ...p, altText: e.target.value }))} disabled={saving} />
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <input type="checkbox" checked={newSpecialist.isActive} onChange={(e) => setNewSpecialist((p) => ({ ...p, isActive: e.target.checked }))} disabled={saving} /> Activo
          </label>
        </div>
        <button type="button" className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-60" onClick={createSpecialist} disabled={saving}>
          Crear especialista
        </button>
      </Card>

      {loading ? <Card><p className="text-sm text-slate-600 dark:text-slate-300">Cargando especialistas...</p></Card> : null}

      {specialists.map((specialist, index) => (
        <Card key={specialist.id} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{specialist.fullName}</h3>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => reorderSpecialists(index, index - 1)} disabled={saving || index === 0}>Subir</button>
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => reorderSpecialists(index, index + 1)} disabled={saving || index === specialists.length - 1}>Bajar</button>
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => setEditingId((prev) => (prev === specialist.id ? null : specialist.id))} disabled={saving}>{editingId === specialist.id ? "Cerrar" : "Editar"}</button>
              <button type="button" className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-700" onClick={() => removeSpecialist(specialist)} disabled={saving}>Eliminar</button>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Orden #{specialist.sortOrder + 1} · {specialist.isActive ? "Activo" : "Inactivo"}</p>

          {editingId === specialist.id ? (
            <div className="grid gap-3 md:grid-cols-2">
              <input className="input h-11 text-sm" value={specialist.fullName} onChange={(e) => setSpecialists((prev) => prev.map((item) => (item.id === specialist.id ? { ...item, fullName: e.target.value } : item)))} disabled={saving} />
              <input className="input h-11 text-sm" value={specialist.specialty} onChange={(e) => setSpecialists((prev) => prev.map((item) => (item.id === specialist.id ? { ...item, specialty: e.target.value } : item)))} disabled={saving} />
              <textarea className="input min-h-24 text-sm md:col-span-2" value={specialist.bioShort} onChange={(e) => setSpecialists((prev) => prev.map((item) => (item.id === specialist.id ? { ...item, bioShort: e.target.value } : item)))} disabled={saving} />
              <AdminImageField
                label="Imagen especialista"
                value={specialist.imageUrl ?? ""}
                onChange={(value) =>
                  setSpecialists((prev) => prev.map((item) => (item.id === specialist.id ? { ...item, imageUrl: value } : item)))
                }
                uploadFolder="marketing/specialists"
                recommendation="1200x1500 px"
                aspectRatio="4:5"
                placeholder="https://..."
                disabled={saving}
              />
              <input className="input h-11 text-sm" value={specialist.altText ?? ""} onChange={(e) => setSpecialists((prev) => prev.map((item) => (item.id === specialist.id ? { ...item, altText: e.target.value } : item)))} disabled={saving} />
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <input type="checkbox" checked={specialist.isActive} onChange={(e) => setSpecialists((prev) => prev.map((item) => (item.id === specialist.id ? { ...item, isActive: e.target.checked } : item)))} disabled={saving} /> Activo
              </label>
              <button type="button" className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-60 md:justify-self-start" onClick={() => saveSpecialist(specialist)} disabled={saving}>Guardar especialista</button>
            </div>
          ) : (
            <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
              <p><span className="font-semibold">Especialidad:</span> {specialist.specialty}</p>
              <p>{specialist.bioShort}</p>
            </div>
          )}
        </Card>
      ))}

      {validationMessage ? <p className="text-sm text-red-600">{validationMessage}</p> : null}
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
    </div>
  );
}
