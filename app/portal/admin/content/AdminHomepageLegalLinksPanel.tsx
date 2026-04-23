"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Card } from "@/app/portal/components/ui/Card";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

type LegalLinkItem = {
  id: string;
  href: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
};

type LegalLinksApiResponse = {
  legalLinks?: LegalLinkItem[];
  legalLink?: LegalLinkItem;
  error?: string;
  details?: Array<{ path: string; message: string }>;
};

const EMPTY_LEGAL_LINK = {
  href: "",
  label: "",
  isActive: true,
};

export function AdminHomepageLegalLinksPanel() {
  const [legalLinks, setLegalLinks] = useState<LegalLinkItem[]>([]);
  const [newLegalLink, setNewLegalLink] = useState(EMPTY_LEGAL_LINK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadLegalLinks = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await fetchWithRetry("/api/admin/homepage/legal-links");
    const body = (await response.json().catch(() => null)) as LegalLinksApiResponse | null;

    if (!response.ok || !body?.legalLinks) {
      setError(body?.error ?? "No se pudieron cargar los enlaces legales.");
      setLoading(false);
      return;
    }

    setLegalLinks(body.legalLinks);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadLegalLinks();
  }, [loadLegalLinks]);

  const validationMessage = useMemo(() => error, [error]);

  const createLegalLink = async () => {
    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout("/api/admin/homepage/legal-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newLegalLink),
    });

    const body = (await response.json().catch(() => null)) as LegalLinksApiResponse | null;

    if (!response.ok || !body?.legalLink) {
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudo crear el enlace legal.");
      setSaving(false);
      return;
    }

    setLegalLinks((prev) => [...prev, body.legalLink!].sort((a, b) => a.sortOrder - b.sortOrder));
    setNewLegalLink(EMPTY_LEGAL_LINK);
    setSaving(false);
    setSuccess("Enlace legal creado.");
  };

  const saveLegalLink = async (legalLink: LegalLinkItem) => {
    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout(`/api/admin/homepage/legal-links/${legalLink.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        href: legalLink.href,
        label: legalLink.label,
        isActive: legalLink.isActive,
      }),
    });

    const body = (await response.json().catch(() => null)) as LegalLinksApiResponse | null;

    if (!response.ok || !body?.legalLink) {
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudo guardar el enlace legal.");
      setSaving(false);
      return;
    }

    setLegalLinks((prev) => prev.map((item) => (item.id === legalLink.id ? body.legalLink! : item)));
    setSaving(false);
    setSuccess("Enlace legal actualizado.");
  };

  const removeLegalLink = async (legalLink: LegalLinkItem) => {
    if (!window.confirm(`¿Eliminar el enlace legal "${legalLink.label}"?`)) return;

    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout(`/api/admin/homepage/legal-links/${legalLink.id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as LegalLinksApiResponse | null;
      setError(body?.error ?? "No se pudo eliminar el enlace legal.");
      setSaving(false);
      return;
    }

    await loadLegalLinks();
    setSaving(false);
    setSuccess("Enlace legal eliminado.");
  };

  const reorderLegalLinks = async (sourceIndex: number, targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= legalLinks.length) return;

    const ordered = [...legalLinks];
    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, moved);

    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout("/api/admin/homepage/legal-links/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: ordered.map((item) => item.id) }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No se pudo reordenar los enlaces legales.");
      setSaving(false);
      return;
    }

    setLegalLinks(ordered.map((item, index) => ({ ...item, sortOrder: index })));
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Homepage CMS</p>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Enlaces legales</h2>
      </section>

      <Card className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Nuevo enlace legal</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <input className="input h-11 text-sm" placeholder="Etiqueta" value={newLegalLink.label} onChange={(e) => setNewLegalLink((prev) => ({ ...prev, label: e.target.value }))} disabled={saving} />
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <input type="checkbox" checked={newLegalLink.isActive} onChange={(e) => setNewLegalLink((prev) => ({ ...prev, isActive: e.target.checked }))} disabled={saving} /> Activo
          </label>
          <input className="input h-11 text-sm md:col-span-2" placeholder="/terminos o https://..." value={newLegalLink.href} onChange={(e) => setNewLegalLink((prev) => ({ ...prev, href: e.target.value }))} disabled={saving} />
        </div>
        <button type="button" className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-60" onClick={createLegalLink} disabled={saving}>Crear enlace</button>
      </Card>

      {loading ? <Card><p className="text-sm text-slate-600 dark:text-slate-300">Cargando enlaces legales...</p></Card> : null}

      {legalLinks.map((legalLink, index) => (
        <Card key={legalLink.id} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{legalLink.label}</h3>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => reorderLegalLinks(index, index - 1)} disabled={saving || index === 0}>Subir</button>
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => reorderLegalLinks(index, index + 1)} disabled={saving || index === legalLinks.length - 1}>Bajar</button>
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => setEditingId((prev) => (prev === legalLink.id ? null : legalLink.id))} disabled={saving}>{editingId === legalLink.id ? "Cerrar" : "Editar"}</button>
              <button type="button" className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-700" onClick={() => removeLegalLink(legalLink)} disabled={saving}>Eliminar</button>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Orden #{legalLink.sortOrder + 1} · {legalLink.isActive ? "Activo" : "Inactivo"}</p>

          {editingId === legalLink.id ? (
            <div className="grid gap-3 md:grid-cols-2">
              <input className="input h-11 text-sm" value={legalLink.label} onChange={(e) => setLegalLinks((prev) => prev.map((item) => (item.id === legalLink.id ? { ...item, label: e.target.value } : item)))} disabled={saving} />
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <input type="checkbox" checked={legalLink.isActive} onChange={(e) => setLegalLinks((prev) => prev.map((item) => (item.id === legalLink.id ? { ...item, isActive: e.target.checked } : item)))} disabled={saving} /> Activo
              </label>
              <input className="input h-11 text-sm md:col-span-2" value={legalLink.href} onChange={(e) => setLegalLinks((prev) => prev.map((item) => (item.id === legalLink.id ? { ...item, href: e.target.value } : item)))} disabled={saving} />
              <button type="button" className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-60 md:justify-self-start" onClick={() => saveLegalLink(legalLink)} disabled={saving}>Guardar enlace</button>
            </div>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">{legalLink.href}</p>
          )}
        </Card>
      ))}

      {validationMessage ? <p className="text-sm text-red-600">{validationMessage}</p> : null}
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
    </div>
  );
}
