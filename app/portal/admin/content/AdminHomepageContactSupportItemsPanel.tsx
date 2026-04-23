"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Card } from "@/app/portal/components/ui/Card";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";
import { MARKETING_ICON_KEYS } from "@/lib/marketing/homepage-types";

type ContactSupportItem = {
  id: string;
  iconKey: (typeof MARKETING_ICON_KEYS)[number];
  text: string;
  sortOrder: number;
  isActive: boolean;
};

type ContactSupportApiResponse = {
  contactSupportItems?: ContactSupportItem[];
  contactSupportItem?: ContactSupportItem;
  error?: string;
  details?: Array<{ path: string; message: string }>;
};

const EMPTY_SUPPORT_ITEM = {
  iconKey: "Headset" as (typeof MARKETING_ICON_KEYS)[number],
  text: "",
  isActive: true,
};

export function AdminHomepageContactSupportItemsPanel() {
  const [items, setItems] = useState<ContactSupportItem[]>([]);
  const [newItem, setNewItem] = useState(EMPTY_SUPPORT_ITEM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await fetchWithRetry("/api/admin/homepage/contact-support-items");
    const body = (await response.json().catch(() => null)) as ContactSupportApiResponse | null;

    if (!response.ok || !body?.contactSupportItems) {
      setError(body?.error ?? "No se pudieron cargar los ítems de soporte.");
      setLoading(false);
      return;
    }

    setItems(body.contactSupportItems);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const validationMessage = useMemo(() => error, [error]);

  const createItem = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const response = await fetchWithTimeout("/api/admin/homepage/contact-support-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newItem),
    });
    const body = (await response.json().catch(() => null)) as ContactSupportApiResponse | null;

    if (!response.ok || !body?.contactSupportItem) {
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudo crear el ítem de soporte.");
      setSaving(false);
      return;
    }

    setItems((prev) => [...prev, body.contactSupportItem!].sort((a, b) => a.sortOrder - b.sortOrder));
    setNewItem(EMPTY_SUPPORT_ITEM);
    setSaving(false);
    setSuccess("Ítem de soporte creado.");
  };

  const saveItem = async (item: ContactSupportItem) => {
    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout(`/api/admin/homepage/contact-support-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ iconKey: item.iconKey, text: item.text, isActive: item.isActive }),
    });
    const body = (await response.json().catch(() => null)) as ContactSupportApiResponse | null;

    if (!response.ok || !body?.contactSupportItem) {
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudo guardar el ítem de soporte.");
      setSaving(false);
      return;
    }

    setItems((prev) => prev.map((candidate) => (candidate.id === item.id ? body.contactSupportItem! : candidate)));
    setSaving(false);
    setSuccess("Ítem de soporte actualizado.");
  };

  const removeItem = async (item: ContactSupportItem) => {
    if (!window.confirm(`¿Eliminar el ítem "${item.text}"?`)) return;

    setSaving(true);
    setError(null);
    const response = await fetchWithTimeout(`/api/admin/homepage/contact-support-items/${item.id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as ContactSupportApiResponse | null;
      setError(body?.error ?? "No se pudo eliminar el ítem de soporte.");
      setSaving(false);
      return;
    }

    await loadItems();
    setSaving(false);
    setSuccess("Ítem de soporte eliminado.");
  };

  const reorderItems = async (sourceIndex: number, targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const ordered = [...items];
    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, moved);

    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout("/api/admin/homepage/contact-support-items/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: ordered.map((item) => item.id) }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No se pudo reordenar los ítems de soporte.");
      setSaving(false);
      return;
    }

    setItems(ordered.map((item, index) => ({ ...item, sortOrder: index })));
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Homepage CMS</p>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Ítems de soporte</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">Bloque de ayuda en sección de contacto.</p>
      </section>

      <Card className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Nuevo ítem de soporte</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <select className="input h-11 text-sm" value={newItem.iconKey} onChange={(e) => setNewItem((prev) => ({ ...prev, iconKey: e.target.value as (typeof MARKETING_ICON_KEYS)[number] }))} disabled={saving}>
            {MARKETING_ICON_KEYS.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
          </select>
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <input type="checkbox" checked={newItem.isActive} onChange={(e) => setNewItem((prev) => ({ ...prev, isActive: e.target.checked }))} disabled={saving} /> Activo
          </label>
          <textarea className="input min-h-24 text-sm md:col-span-2" placeholder="Texto" value={newItem.text} onChange={(e) => setNewItem((prev) => ({ ...prev, text: e.target.value }))} disabled={saving} />
        </div>
        <button type="button" className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-60" onClick={createItem} disabled={saving}>Crear ítem</button>
      </Card>

      {loading ? <Card><p className="text-sm text-slate-600 dark:text-slate-300">Cargando ítems...</p></Card> : null}

      {items.map((item, index) => (
        <Card key={item.id} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{item.text}</h3>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => reorderItems(index, index - 1)} disabled={saving || index === 0}>Subir</button>
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => reorderItems(index, index + 1)} disabled={saving || index === items.length - 1}>Bajar</button>
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => setEditingId((prev) => (prev === item.id ? null : item.id))} disabled={saving}>{editingId === item.id ? "Cerrar" : "Editar"}</button>
              <button type="button" className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-700" onClick={() => removeItem(item)} disabled={saving}>Eliminar</button>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Orden #{item.sortOrder + 1} · {item.isActive ? "Activo" : "Inactivo"} · Icono: {item.iconKey}</p>

          {editingId === item.id ? (
            <div className="grid gap-3 md:grid-cols-2">
              <select className="input h-11 text-sm" value={item.iconKey} onChange={(e) => setItems((prev) => prev.map((candidate) => (candidate.id === item.id ? { ...candidate, iconKey: e.target.value as (typeof MARKETING_ICON_KEYS)[number] } : candidate)))} disabled={saving}>
                {MARKETING_ICON_KEYS.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
              </select>
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <input type="checkbox" checked={item.isActive} onChange={(e) => setItems((prev) => prev.map((candidate) => (candidate.id === item.id ? { ...candidate, isActive: e.target.checked } : candidate)))} disabled={saving} /> Activo
              </label>
              <textarea className="input min-h-24 text-sm md:col-span-2" value={item.text} onChange={(e) => setItems((prev) => prev.map((candidate) => (candidate.id === item.id ? { ...candidate, text: e.target.value } : candidate)))} disabled={saving} />
              <button type="button" className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-60 md:justify-self-start" onClick={() => saveItem(item)} disabled={saving}>Guardar ítem</button>
            </div>
          ) : null}
        </Card>
      ))}

      {validationMessage ? <p className="text-sm text-red-600">{validationMessage}</p> : null}
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
    </div>
  );
}
