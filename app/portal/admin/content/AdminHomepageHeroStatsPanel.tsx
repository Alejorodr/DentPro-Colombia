"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Card } from "@/app/portal/components/ui/Card";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

type HeroStatItem = {
  id: string;
  label: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
};

type HeroStatsApiResponse = {
  heroStats?: HeroStatItem[];
  heroStat?: HeroStatItem;
  error?: string;
  details?: Array<{ path: string; message: string }>;
};

const EMPTY_HERO_STAT = {
  label: "",
  description: "",
  isActive: true,
};

export function AdminHomepageHeroStatsPanel() {
  const [heroStats, setHeroStats] = useState<HeroStatItem[]>([]);
  const [newHeroStat, setNewHeroStat] = useState(EMPTY_HERO_STAT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadHeroStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await fetchWithRetry("/api/admin/homepage/hero-stats");
    const body = (await response.json().catch(() => null)) as HeroStatsApiResponse | null;

    if (!response.ok || !body?.heroStats) {
      setError(body?.error ?? "No se pudieron cargar las estadísticas del hero.");
      setLoading(false);
      return;
    }

    setHeroStats(body.heroStats);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadHeroStats();
  }, [loadHeroStats]);

  const validationMessage = useMemo(() => error, [error]);

  const createHeroStat = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const response = await fetchWithTimeout("/api/admin/homepage/hero-stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newHeroStat),
    });

    const body = (await response.json().catch(() => null)) as HeroStatsApiResponse | null;

    if (!response.ok || !body?.heroStat) {
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudo crear la estadística.");
      setSaving(false);
      return;
    }

    setHeroStats((prev) => [...prev, body.heroStat!].sort((a, b) => a.sortOrder - b.sortOrder));
    setNewHeroStat(EMPTY_HERO_STAT);
    setSaving(false);
    setSuccess("Estadística creada.");
  };

  const saveHeroStat = async (heroStat: HeroStatItem) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const response = await fetchWithTimeout(`/api/admin/homepage/hero-stats/${heroStat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: heroStat.label,
        description: heroStat.description,
        isActive: heroStat.isActive,
      }),
    });

    const body = (await response.json().catch(() => null)) as HeroStatsApiResponse | null;

    if (!response.ok || !body?.heroStat) {
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudo guardar la estadística.");
      setSaving(false);
      return;
    }

    setHeroStats((prev) => prev.map((item) => (item.id === heroStat.id ? body.heroStat! : item)));
    setSaving(false);
    setSuccess("Estadística actualizada.");
  };

  const removeHeroStat = async (heroStat: HeroStatItem) => {
    if (!window.confirm(`¿Eliminar la estadística "${heroStat.label}"?`)) return;

    setSaving(true);
    setError(null);
    const response = await fetchWithTimeout(`/api/admin/homepage/hero-stats/${heroStat.id}`, { method: "DELETE" });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as HeroStatsApiResponse | null;
      setError(body?.error ?? "No se pudo eliminar la estadística.");
      setSaving(false);
      return;
    }

    await loadHeroStats();
    setSaving(false);
    setSuccess("Estadística eliminada.");
  };

  const reorderHeroStats = async (sourceIndex: number, targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= heroStats.length) return;

    const ordered = [...heroStats];
    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, moved);

    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout("/api/admin/homepage/hero-stats/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: ordered.map((item) => item.id) }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No se pudo reordenar las estadísticas.");
      setSaving(false);
      return;
    }

    setHeroStats(ordered.map((item, index) => ({ ...item, sortOrder: index })));
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Homepage CMS</p>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Hero stats del homepage</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">CRUD, activación y orden manual de estadísticas del hero.</p>
      </section>

      <Card className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Nueva estadística</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <input className="input h-11 text-sm" placeholder="Label" value={newHeroStat.label} onChange={(e) => setNewHeroStat((prev) => ({ ...prev, label: e.target.value }))} disabled={saving} />
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <input type="checkbox" checked={newHeroStat.isActive} onChange={(e) => setNewHeroStat((prev) => ({ ...prev, isActive: e.target.checked }))} disabled={saving} /> Activo
          </label>
          <textarea className="input min-h-24 text-sm md:col-span-2" placeholder="Descripción" value={newHeroStat.description} onChange={(e) => setNewHeroStat((prev) => ({ ...prev, description: e.target.value }))} disabled={saving} />
        </div>
        <button type="button" className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-60" onClick={createHeroStat} disabled={saving}>
          Crear estadística
        </button>
      </Card>

      {loading ? <Card><p className="text-sm text-slate-600 dark:text-slate-300">Cargando estadísticas...</p></Card> : null}

      {heroStats.map((heroStat, index) => (
        <Card key={heroStat.id} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{heroStat.label}</h3>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => reorderHeroStats(index, index - 1)} disabled={saving || index === 0}>Subir</button>
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => reorderHeroStats(index, index + 1)} disabled={saving || index === heroStats.length - 1}>Bajar</button>
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => setEditingId((prev) => (prev === heroStat.id ? null : heroStat.id))} disabled={saving}>{editingId === heroStat.id ? "Cerrar" : "Editar"}</button>
              <button type="button" className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-700" onClick={() => removeHeroStat(heroStat)} disabled={saving}>Eliminar</button>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">Orden #{heroStat.sortOrder + 1} · {heroStat.isActive ? "Activo" : "Inactivo"}</p>

          {editingId === heroStat.id ? (
            <div className="grid gap-3 md:grid-cols-2">
              <input className="input h-11 text-sm" value={heroStat.label} onChange={(e) => setHeroStats((prev) => prev.map((item) => (item.id === heroStat.id ? { ...item, label: e.target.value } : item)))} disabled={saving} />
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <input type="checkbox" checked={heroStat.isActive} onChange={(e) => setHeroStats((prev) => prev.map((item) => (item.id === heroStat.id ? { ...item, isActive: e.target.checked } : item)))} disabled={saving} /> Activo
              </label>
              <textarea className="input min-h-24 text-sm md:col-span-2" value={heroStat.description} onChange={(e) => setHeroStats((prev) => prev.map((item) => (item.id === heroStat.id ? { ...item, description: e.target.value } : item)))} disabled={saving} />
              <button type="button" className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-60 md:justify-self-start" onClick={() => saveHeroStat(heroStat)} disabled={saving}>
                Guardar estadística
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">{heroStat.description}</p>
          )}
        </Card>
      ))}

      {validationMessage ? <p className="text-sm text-red-600">{validationMessage}</p> : null}
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
    </div>
  );
}
