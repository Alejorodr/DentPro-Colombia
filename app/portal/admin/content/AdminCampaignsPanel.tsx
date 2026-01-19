"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { MagnifyingGlass, PencilSimple, Trash } from "@/components/ui/Icon";

import { Card } from "@/app/portal/components/ui/Card";
import { Table } from "@/app/portal/components/ui/Table";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

type CampaignRecord = {
  id: string;
  title: string;
  description?: string | null;
  imageUrl: string;
  ctaText?: string | null;
  ctaUrl?: string | null;
  startAt: string;
  endAt: string;
  active: boolean;
};

const emptyForm = {
  title: "",
  description: "",
  imageUrl: "",
  ctaText: "",
  ctaUrl: "",
  startAt: "",
  endAt: "",
  active: true,
};

export function AdminCampaignsPanel() {
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<CampaignRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCampaigns = useCallback(async () => {
    const response = await fetchWithRetry("/api/campaigns");
    if (response.ok) {
      const data = (await response.json()) as CampaignRecord[];
      setCampaigns(data);
    }
  }, []);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  const filteredCampaigns = useMemo(() => {
    if (!query.trim()) return campaigns;
    const normalized = query.toLowerCase();
    return campaigns.filter(
      (campaign) =>
        campaign.title.toLowerCase().includes(normalized) ||
        (campaign.description ?? "").toLowerCase().includes(normalized),
    );
  }, [campaigns, query]);

  const createCampaign = async () => {
    if (!form.title || !form.imageUrl || !form.startAt || !form.endAt) {
      setError("Título, imagen y fechas son obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);
    const response = await fetchWithTimeout("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description || null,
        imageUrl: form.imageUrl,
        ctaText: form.ctaText || null,
        ctaUrl: form.ctaUrl || null,
        startAt: form.startAt,
        endAt: form.endAt,
        active: form.active,
      }),
    });

    if (response.ok) {
      setForm(emptyForm);
      await loadCampaigns();
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No se pudo crear la campaña.");
    }

    setSaving(false);
  };

  const updateCampaign = async () => {
    if (!editing) {
      return;
    }
    setSaving(true);
    setError(null);
    const response = await fetchWithTimeout(`/api/campaigns/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editing.title,
        description: editing.description ?? null,
        imageUrl: editing.imageUrl,
        ctaText: editing.ctaText ?? null,
        ctaUrl: editing.ctaUrl ?? null,
        startAt: editing.startAt,
        endAt: editing.endAt,
        active: editing.active,
      }),
    });

    if (response.ok) {
      setEditing(null);
      await loadCampaigns();
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No se pudo actualizar la campaña.");
    }

    setSaving(false);
  };

  const removeCampaign = async (campaign: CampaignRecord) => {
    if (!window.confirm(`¿Eliminar la campaña ${campaign.title}?`)) {
      return;
    }
    setSaving(true);
    await fetchWithTimeout(`/api/campaigns/${campaign.id}`, { method: "DELETE" });
    await loadCampaigns();
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Content CMS</p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Campañas activas</h1>
        </div>
        <div className="relative w-full max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Buscar campaña"
            className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-700 dark:border-surface-muted dark:bg-surface-base dark:text-slate-200"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </section>

      <Card className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Nueva campaña</p>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Crear campaña</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <input
            className="input h-11 text-sm"
            placeholder="Título"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            disabled={saving}
          />
          <input
            className="input h-11 text-sm"
            placeholder="Descripción"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            disabled={saving}
          />
          <input
            className="input h-11 text-sm md:col-span-2"
            placeholder="Image URL"
            value={form.imageUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
            disabled={saving}
          />
          <input
            className="input h-11 text-sm"
            placeholder="CTA text"
            value={form.ctaText}
            onChange={(event) => setForm((prev) => ({ ...prev, ctaText: event.target.value }))}
            disabled={saving}
          />
          <input
            className="input h-11 text-sm"
            placeholder="CTA URL"
            value={form.ctaUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, ctaUrl: event.target.value }))}
            disabled={saving}
          />
          <input
            className="input h-11 text-sm"
            type="date"
            value={form.startAt}
            onChange={(event) => setForm((prev) => ({ ...prev, startAt: event.target.value }))}
            disabled={saving}
          />
          <input
            className="input h-11 text-sm"
            type="date"
            value={form.endAt}
            onChange={(event) => setForm((prev) => ({ ...prev, endAt: event.target.value }))}
            disabled={saving}
          />
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
              disabled={saving}
            />
            Activa
          </label>
        </div>
        <button
          type="button"
          className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white"
          onClick={createCampaign}
          disabled={saving}
        >
          Crear campaña
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </Card>

      <Card className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Listado</p>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Campañas</h2>
        </div>
        <Table>
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-surface-muted/70 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 font-semibold">Título</th>
              <th className="px-4 py-3 font-semibold">Vigencia</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm text-slate-600 dark:divide-surface-muted dark:text-slate-200">
            {filteredCampaigns.map((campaign) => (
              <tr key={campaign.id} className="bg-white dark:bg-surface-elevated/60">
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{campaign.title}</td>
                <td className="px-4 py-3">
                  {campaign.startAt.slice(0, 10)} → {campaign.endAt.slice(0, 10)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      campaign.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {campaign.active ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-surface-muted dark:text-slate-200"
                      onClick={() => setEditing(campaign)}
                    >
                      <PencilSimple size={14} />
                      Editar
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600"
                      onClick={() => removeCampaign(campaign)}
                      disabled={saving}
                    >
                      <Trash size={14} />
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-elevated">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Editar campaña</p>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{editing.title}</h3>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <input
                className="input h-11 text-sm"
                placeholder="Título"
                value={editing.title}
                onChange={(event) => setEditing((prev) => (prev ? { ...prev, title: event.target.value } : null))}
              />
              <input
                className="input h-11 text-sm"
                placeholder="Descripción"
                value={editing.description ?? ""}
                onChange={(event) =>
                  setEditing((prev) => (prev ? { ...prev, description: event.target.value } : null))
                }
              />
              <input
                className="input h-11 text-sm md:col-span-2"
                placeholder="Image URL"
                value={editing.imageUrl}
                onChange={(event) => setEditing((prev) => (prev ? { ...prev, imageUrl: event.target.value } : null))}
              />
              <input
                className="input h-11 text-sm"
                placeholder="CTA text"
                value={editing.ctaText ?? ""}
                onChange={(event) => setEditing((prev) => (prev ? { ...prev, ctaText: event.target.value } : null))}
              />
              <input
                className="input h-11 text-sm"
                placeholder="CTA URL"
                value={editing.ctaUrl ?? ""}
                onChange={(event) => setEditing((prev) => (prev ? { ...prev, ctaUrl: event.target.value } : null))}
              />
              <input
                className="input h-11 text-sm"
                type="date"
                value={editing.startAt.slice(0, 10)}
                onChange={(event) =>
                  setEditing((prev) => (prev ? { ...prev, startAt: event.target.value } : null))
                }
              />
              <input
                className="input h-11 text-sm"
                type="date"
                value={editing.endAt.slice(0, 10)}
                onChange={(event) =>
                  setEditing((prev) => (prev ? { ...prev, endAt: event.target.value } : null))
                }
              />
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(event) =>
                    setEditing((prev) => (prev ? { ...prev, active: event.target.checked } : null))
                  }
                />
                Activa
              </label>
            </div>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase text-slate-600"
                onClick={() => setEditing(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white"
                onClick={updateCampaign}
                disabled={saving}
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
