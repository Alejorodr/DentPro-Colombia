"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Card } from "@/app/portal/components/ui/Card";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

type NavLinkItem = {
  id: string;
  href: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
};

type NavLinksApiResponse = {
  navLinks?: NavLinkItem[];
  navLink?: NavLinkItem;
  error?: string;
  details?: Array<{ path: string; message: string }>;
};

const EMPTY_NAV_LINK = {
  href: "",
  label: "",
  isActive: true,
};

export function AdminHomepageNavLinksPanel() {
  const [navLinks, setNavLinks] = useState<NavLinkItem[]>([]);
  const [newNavLink, setNewNavLink] = useState(EMPTY_NAV_LINK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadNavLinks = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await fetchWithRetry("/api/admin/homepage/nav-links");
    const body = (await response.json().catch(() => null)) as NavLinksApiResponse | null;

    if (!response.ok || !body?.navLinks) {
      setError(body?.error ?? "No se pudieron cargar los enlaces de navegación.");
      setLoading(false);
      return;
    }

    setNavLinks(body.navLinks);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadNavLinks();
  }, [loadNavLinks]);

  const validationMessage = useMemo(() => error, [error]);

  const createNavLink = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const response = await fetchWithTimeout("/api/admin/homepage/nav-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newNavLink),
    });

    const body = (await response.json().catch(() => null)) as NavLinksApiResponse | null;

    if (!response.ok || !body?.navLink) {
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudo crear el enlace de navegación.");
      setSaving(false);
      return;
    }

    setNavLinks((prev) => [...prev, body.navLink!].sort((a, b) => a.sortOrder - b.sortOrder));
    setNewNavLink(EMPTY_NAV_LINK);
    setSaving(false);
    setSuccess("Enlace de navegación creado.");
  };

  const saveNavLink = async (navLink: NavLinkItem) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const response = await fetchWithTimeout(`/api/admin/homepage/nav-links/${navLink.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        href: navLink.href,
        label: navLink.label,
        isActive: navLink.isActive,
      }),
    });

    const body = (await response.json().catch(() => null)) as NavLinksApiResponse | null;

    if (!response.ok || !body?.navLink) {
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudo guardar el enlace de navegación.");
      setSaving(false);
      return;
    }

    setNavLinks((prev) => prev.map((item) => (item.id === navLink.id ? body.navLink! : item)));
    setSaving(false);
    setSuccess("Enlace de navegación actualizado.");
  };

  const removeNavLink = async (navLink: NavLinkItem) => {
    if (!window.confirm(`¿Eliminar el enlace "${navLink.label}"?`)) return;

    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout(`/api/admin/homepage/nav-links/${navLink.id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as NavLinksApiResponse | null;
      setError(body?.error ?? "No se pudo eliminar el enlace de navegación.");
      setSaving(false);
      return;
    }

    await loadNavLinks();
    setSaving(false);
    setSuccess("Enlace de navegación eliminado.");
  };

  const reorderNavLinks = async (sourceIndex: number, targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= navLinks.length) return;

    const ordered = [...navLinks];
    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, moved);

    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout("/api/admin/homepage/nav-links/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: ordered.map((item) => item.id) }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No se pudo reordenar los enlaces de navegación.");
      setSaving(false);
      return;
    }

    setNavLinks(ordered.map((item, index) => ({ ...item, sortOrder: index })));
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Homepage CMS</p>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Enlaces del menú de navegación</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Los enlaces que aparecen en la barra de navegación superior del homepage (ej. "#servicios", "#contacto").
        </p>
      </section>

      <Card className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Nuevo enlace</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <input className="input h-11 text-sm" placeholder="Etiqueta" value={newNavLink.label} onChange={(e) => setNewNavLink((prev) => ({ ...prev, label: e.target.value }))} disabled={saving} />
          <input className="input h-11 text-sm" placeholder="#agenda o /ruta" value={newNavLink.href} onChange={(e) => setNewNavLink((prev) => ({ ...prev, href: e.target.value }))} disabled={saving} />
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <input type="checkbox" checked={newNavLink.isActive} onChange={(e) => setNewNavLink((prev) => ({ ...prev, isActive: e.target.checked }))} disabled={saving} /> Activo
          </label>
        </div>
        <button type="button" className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-60" onClick={createNavLink} disabled={saving}>
          Crear enlace
        </button>
      </Card>

      {loading ? <Card><p className="text-sm text-slate-600 dark:text-slate-300">Cargando enlaces...</p></Card> : null}

      {navLinks.map((navLink, index) => (
        <Card key={navLink.id} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{navLink.label}</h3>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => reorderNavLinks(index, index - 1)} disabled={saving || index === 0}>Subir</button>
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => reorderNavLinks(index, index + 1)} disabled={saving || index === navLinks.length - 1}>Bajar</button>
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => setEditingId((prev) => (prev === navLink.id ? null : navLink.id))} disabled={saving}>{editingId === navLink.id ? "Cerrar" : "Editar"}</button>
              <button type="button" className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-700" onClick={() => removeNavLink(navLink)} disabled={saving}>Eliminar</button>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">Orden #{navLink.sortOrder + 1} · {navLink.isActive ? "Activo" : "Inactivo"}</p>

          {editingId === navLink.id ? (
            <div className="grid gap-3 md:grid-cols-2">
              <input className="input h-11 text-sm" value={navLink.label} onChange={(e) => setNavLinks((prev) => prev.map((item) => (item.id === navLink.id ? { ...item, label: e.target.value } : item)))} disabled={saving} />
              <input className="input h-11 text-sm" value={navLink.href} onChange={(e) => setNavLinks((prev) => prev.map((item) => (item.id === navLink.id ? { ...item, href: e.target.value } : item)))} disabled={saving} />
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <input type="checkbox" checked={navLink.isActive} onChange={(e) => setNavLinks((prev) => prev.map((item) => (item.id === navLink.id ? { ...item, isActive: e.target.checked } : item)))} disabled={saving} /> Activo
              </label>
              <button type="button" className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-60 md:justify-self-start" onClick={() => saveNavLink(navLink)} disabled={saving}>
                Guardar enlace
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">{navLink.href}</p>
          )}
        </Card>
      ))}

      {validationMessage ? <p className="text-sm text-red-600">{validationMessage}</p> : null}
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
    </div>
  );
}
