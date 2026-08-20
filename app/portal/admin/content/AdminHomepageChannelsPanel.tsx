"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Card } from "@/app/portal/components/ui/Card";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

import { PlacementCheckboxes } from "./components/PlacementCheckboxes";

const CHANNEL_TYPES = ["WHATSAPP", "PHONE", "EMAIL"] as const;

const CHANNEL_TYPE_LABELS: Record<(typeof CHANNEL_TYPES)[number], string> = {
  WHATSAPP: "WhatsApp",
  PHONE: "Teléfono",
  EMAIL: "Email",
};

const CHANNEL_VALUE_PLACEHOLDERS: Record<(typeof CHANNEL_TYPES)[number], string> = {
  WHATSAPP: "573237968435",
  PHONE: "573237968435",
  EMAIL: "correo@dentpro.co",
};

type ChannelItem = {
  id: string;
  type: (typeof CHANNEL_TYPES)[number];
  value: string;
  label: string;
  placements: string[];
  sortOrder: number;
  isActive: boolean;
};

type ChannelsApiResponse = {
  channels?: ChannelItem[];
  channel?: ChannelItem;
  error?: string;
  details?: Array<{ path: string; message: string }>;
};

const EMPTY_CHANNEL = {
  type: "WHATSAPP" as (typeof CHANNEL_TYPES)[number],
  value: "",
  label: "",
  placements: [] as string[],
  isActive: true,
};

export function AdminHomepageChannelsPanel() {
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [newChannel, setNewChannel] = useState(EMPTY_CHANNEL);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadChannels = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await fetchWithRetry("/api/admin/homepage/channels");
    const body = (await response.json().catch(() => null)) as ChannelsApiResponse | null;

    if (!response.ok || !body?.channels) {
      setError(body?.error ?? "No se pudieron cargar los canales.");
      setLoading(false);
      return;
    }

    setChannels(body.channels);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadChannels();
  }, [loadChannels]);

  const validationMessage = useMemo(() => error, [error]);

  const createChannel = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const response = await fetchWithTimeout("/api/admin/homepage/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newChannel),
    });

    const body = (await response.json().catch(() => null)) as ChannelsApiResponse | null;

    if (!response.ok || !body?.channel) {
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudo crear el canal.");
      setSaving(false);
      return;
    }

    setChannels((prev) => [...prev, body.channel!].sort((a, b) => a.sortOrder - b.sortOrder));
    setNewChannel(EMPTY_CHANNEL);
    setSaving(false);
    setSuccess("Canal creado.");
  };

  const saveChannel = async (channel: ChannelItem) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const response = await fetchWithTimeout(`/api/admin/homepage/channels/${channel.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: channel.type,
        value: channel.value,
        label: channel.label,
        placements: channel.placements,
        isActive: channel.isActive,
      }),
    });

    const body = (await response.json().catch(() => null)) as ChannelsApiResponse | null;

    if (!response.ok || !body?.channel) {
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudo guardar el canal.");
      setSaving(false);
      return;
    }

    setChannels((prev) => prev.map((item) => (item.id === channel.id ? body.channel! : item)));
    setSaving(false);
    setSuccess("Canal actualizado.");
  };

  const removeChannel = async (channel: ChannelItem) => {
    if (!window.confirm(`¿Eliminar el canal "${channel.label}"?`)) return;

    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout(`/api/admin/homepage/channels/${channel.id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as ChannelsApiResponse | null;
      setError(body?.error ?? "No se pudo eliminar el canal.");
      setSaving(false);
      return;
    }

    await loadChannels();
    setSaving(false);
    setSuccess("Canal eliminado.");
  };

  const reorderChannels = async (sourceIndex: number, targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= channels.length) return;

    const ordered = [...channels];
    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, moved);

    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout("/api/admin/homepage/channels/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: ordered.map((item) => item.id) }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No se pudo reordenar los canales.");
      setSaving(false);
      return;
    }

    setChannels(ordered.map((item, index) => ({ ...item, sortOrder: index })));
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Homepage CMS</p>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Canales de contacto</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">WhatsApp, teléfono y email usados en toda la página de inicio.</p>
      </section>

      <Card className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Nuevo canal</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <input className="input h-11 text-sm" placeholder="Etiqueta" value={newChannel.label} onChange={(e) => setNewChannel((prev) => ({ ...prev, label: e.target.value }))} disabled={saving} />
          <select className="input h-11 text-sm" value={newChannel.type} onChange={(e) => setNewChannel((prev) => ({ ...prev, type: e.target.value as (typeof CHANNEL_TYPES)[number] }))} disabled={saving}>
            {CHANNEL_TYPES.map((type) => (
              <option key={type} value={type}>{CHANNEL_TYPE_LABELS[type]}</option>
            ))}
          </select>
          <input
            className="input h-11 text-sm md:col-span-2"
            placeholder={CHANNEL_VALUE_PLACEHOLDERS[newChannel.type]}
            value={newChannel.value}
            onChange={(e) => setNewChannel((prev) => ({ ...prev, value: e.target.value }))}
            disabled={saving}
          />
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <input type="checkbox" checked={newChannel.isActive} onChange={(e) => setNewChannel((prev) => ({ ...prev, isActive: e.target.checked }))} disabled={saving} /> Activo
          </label>
          <div className="md:col-span-2">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Ubicaciones</p>
            <PlacementCheckboxes
              value={newChannel.placements}
              onChange={(next) => setNewChannel((prev) => ({ ...prev, placements: next }))}
              disabled={saving}
            />
          </div>
        </div>
        <button type="button" className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-60" onClick={createChannel} disabled={saving}>
          Crear canal
        </button>
      </Card>

      {loading ? <Card><p className="text-sm text-slate-600 dark:text-slate-300">Cargando canales...</p></Card> : null}

      {channels.map((channel, index) => (
        <Card key={channel.id} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{channel.label}</h3>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => reorderChannels(index, index - 1)} disabled={saving || index === 0}>Subir</button>
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => reorderChannels(index, index + 1)} disabled={saving || index === channels.length - 1}>Bajar</button>
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => setEditingId((prev) => (prev === channel.id ? null : channel.id))} disabled={saving}>{editingId === channel.id ? "Cerrar" : "Editar"}</button>
              <button type="button" className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-700" onClick={() => removeChannel(channel)} disabled={saving}>Eliminar</button>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">Orden #{channel.sortOrder + 1} · {channel.isActive ? "Activo" : "Inactivo"} · Tipo: {CHANNEL_TYPE_LABELS[channel.type]}</p>

          {editingId === channel.id ? (
            <div className="grid gap-3 md:grid-cols-2">
              <input className="input h-11 text-sm" value={channel.label} onChange={(e) => setChannels((prev) => prev.map((item) => (item.id === channel.id ? { ...item, label: e.target.value } : item)))} disabled={saving} />
              <select className="input h-11 text-sm" value={channel.type} onChange={(e) => setChannels((prev) => prev.map((item) => (item.id === channel.id ? { ...item, type: e.target.value as (typeof CHANNEL_TYPES)[number] } : item)))} disabled={saving}>
                {CHANNEL_TYPES.map((type) => (
                  <option key={type} value={type}>{CHANNEL_TYPE_LABELS[type]}</option>
                ))}
              </select>
              <input
                className="input h-11 text-sm md:col-span-2"
                placeholder={CHANNEL_VALUE_PLACEHOLDERS[channel.type]}
                value={channel.value}
                onChange={(e) => setChannels((prev) => prev.map((item) => (item.id === channel.id ? { ...item, value: e.target.value } : item)))}
                disabled={saving}
              />
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <input type="checkbox" checked={channel.isActive} onChange={(e) => setChannels((prev) => prev.map((item) => (item.id === channel.id ? { ...item, isActive: e.target.checked } : item)))} disabled={saving} /> Activo
              </label>
              <div className="md:col-span-2">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Ubicaciones</p>
                <PlacementCheckboxes
                  value={channel.placements}
                  onChange={(next) => setChannels((prev) => prev.map((item) => (item.id === channel.id ? { ...item, placements: next } : item)))}
                  disabled={saving}
                />
              </div>
              <button type="button" className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-60 md:justify-self-start" onClick={() => saveChannel(channel)} disabled={saving}>
                Guardar canal
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">{channel.value}</p>
          )}
        </Card>
      ))}

      {validationMessage ? <p className="text-sm text-red-600">{validationMessage}</p> : null}
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
    </div>
  );
}
