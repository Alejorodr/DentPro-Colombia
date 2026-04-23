"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Card } from "@/app/portal/components/ui/Card";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";
import { MARKETING_ICON_KEYS } from "@/lib/marketing/homepage-types";

type SocialLinkItem = {
  id: string;
  href: string;
  label: string;
  iconKey: (typeof MARKETING_ICON_KEYS)[number];
  sortOrder: number;
  isActive: boolean;
};

type SocialLinksApiResponse = {
  socialLinks?: SocialLinkItem[];
  socialLink?: SocialLinkItem;
  error?: string;
  details?: Array<{ path: string; message: string }>;
};

const EMPTY_SOCIAL_LINK = {
  href: "",
  label: "",
  iconKey: "InstagramLogo" as (typeof MARKETING_ICON_KEYS)[number],
  isActive: true,
};

export function AdminHomepageSocialLinksPanel() {
  const [socialLinks, setSocialLinks] = useState<SocialLinkItem[]>([]);
  const [newSocialLink, setNewSocialLink] = useState(EMPTY_SOCIAL_LINK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSocialLinks = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await fetchWithRetry("/api/admin/homepage/social-links");
    const body = (await response.json().catch(() => null)) as SocialLinksApiResponse | null;

    if (!response.ok || !body?.socialLinks) {
      setError(body?.error ?? "No se pudieron cargar las redes sociales.");
      setLoading(false);
      return;
    }

    setSocialLinks(body.socialLinks);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadSocialLinks();
  }, [loadSocialLinks]);

  const validationMessage = useMemo(() => error, [error]);

  const createSocialLink = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const response = await fetchWithTimeout("/api/admin/homepage/social-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSocialLink),
    });

    const body = (await response.json().catch(() => null)) as SocialLinksApiResponse | null;

    if (!response.ok || !body?.socialLink) {
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudo crear el enlace social.");
      setSaving(false);
      return;
    }

    setSocialLinks((prev) => [...prev, body.socialLink!].sort((a, b) => a.sortOrder - b.sortOrder));
    setNewSocialLink(EMPTY_SOCIAL_LINK);
    setSaving(false);
    setSuccess("Enlace social creado.");
  };

  const saveSocialLink = async (socialLink: SocialLinkItem) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const response = await fetchWithTimeout(`/api/admin/homepage/social-links/${socialLink.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        href: socialLink.href,
        label: socialLink.label,
        iconKey: socialLink.iconKey,
        isActive: socialLink.isActive,
      }),
    });

    const body = (await response.json().catch(() => null)) as SocialLinksApiResponse | null;

    if (!response.ok || !body?.socialLink) {
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudo guardar el enlace social.");
      setSaving(false);
      return;
    }

    setSocialLinks((prev) => prev.map((item) => (item.id === socialLink.id ? body.socialLink! : item)));
    setSaving(false);
    setSuccess("Enlace social actualizado.");
  };

  const removeSocialLink = async (socialLink: SocialLinkItem) => {
    if (!window.confirm(`¿Eliminar el enlace social "${socialLink.label}"?`)) return;

    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout(`/api/admin/homepage/social-links/${socialLink.id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as SocialLinksApiResponse | null;
      setError(body?.error ?? "No se pudo eliminar el enlace social.");
      setSaving(false);
      return;
    }

    await loadSocialLinks();
    setSaving(false);
    setSuccess("Enlace social eliminado.");
  };

  const reorderSocialLinks = async (sourceIndex: number, targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= socialLinks.length) return;

    const ordered = [...socialLinks];
    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, moved);

    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout("/api/admin/homepage/social-links/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: ordered.map((item) => item.id) }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No se pudo reordenar los enlaces sociales.");
      setSaving(false);
      return;
    }

    setSocialLinks(ordered.map((item, index) => ({ ...item, sortOrder: index })));
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Homepage CMS</p>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Redes sociales compartidas</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">Lista única usada en InfoBar y en el bloque de Contacto.</p>
      </section>

      <Card className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Nuevo enlace social</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <input className="input h-11 text-sm" placeholder="Etiqueta" value={newSocialLink.label} onChange={(e) => setNewSocialLink((prev) => ({ ...prev, label: e.target.value }))} disabled={saving} />
          <select className="input h-11 text-sm" value={newSocialLink.iconKey} onChange={(e) => setNewSocialLink((prev) => ({ ...prev, iconKey: e.target.value as (typeof MARKETING_ICON_KEYS)[number] }))} disabled={saving}>
            {MARKETING_ICON_KEYS.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
          </select>
          <input className="input h-11 text-sm md:col-span-2" placeholder="https://..." value={newSocialLink.href} onChange={(e) => setNewSocialLink((prev) => ({ ...prev, href: e.target.value }))} disabled={saving} />
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <input type="checkbox" checked={newSocialLink.isActive} onChange={(e) => setNewSocialLink((prev) => ({ ...prev, isActive: e.target.checked }))} disabled={saving} /> Activo
          </label>
        </div>
        <button type="button" className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-60" onClick={createSocialLink} disabled={saving}>
          Crear enlace
        </button>
      </Card>

      {loading ? <Card><p className="text-sm text-slate-600 dark:text-slate-300">Cargando enlaces sociales...</p></Card> : null}

      {socialLinks.map((socialLink, index) => (
        <Card key={socialLink.id} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{socialLink.label}</h3>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => reorderSocialLinks(index, index - 1)} disabled={saving || index === 0}>Subir</button>
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => reorderSocialLinks(index, index + 1)} disabled={saving || index === socialLinks.length - 1}>Bajar</button>
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => setEditingId((prev) => (prev === socialLink.id ? null : socialLink.id))} disabled={saving}>{editingId === socialLink.id ? "Cerrar" : "Editar"}</button>
              <button type="button" className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-700" onClick={() => removeSocialLink(socialLink)} disabled={saving}>Eliminar</button>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">Orden #{socialLink.sortOrder + 1} · {socialLink.isActive ? "Activo" : "Inactivo"} · Icono: {socialLink.iconKey}</p>

          {editingId === socialLink.id ? (
            <div className="grid gap-3 md:grid-cols-2">
              <input className="input h-11 text-sm" value={socialLink.label} onChange={(e) => setSocialLinks((prev) => prev.map((item) => (item.id === socialLink.id ? { ...item, label: e.target.value } : item)))} disabled={saving} />
              <select className="input h-11 text-sm" value={socialLink.iconKey} onChange={(e) => setSocialLinks((prev) => prev.map((item) => (item.id === socialLink.id ? { ...item, iconKey: e.target.value as (typeof MARKETING_ICON_KEYS)[number] } : item)))} disabled={saving}>
                {MARKETING_ICON_KEYS.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
              </select>
              <input className="input h-11 text-sm md:col-span-2" value={socialLink.href} onChange={(e) => setSocialLinks((prev) => prev.map((item) => (item.id === socialLink.id ? { ...item, href: e.target.value } : item)))} disabled={saving} />
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <input type="checkbox" checked={socialLink.isActive} onChange={(e) => setSocialLinks((prev) => prev.map((item) => (item.id === socialLink.id ? { ...item, isActive: e.target.checked } : item)))} disabled={saving} /> Activo
              </label>
              <button type="button" className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-60 md:justify-self-start" onClick={() => saveSocialLink(socialLink)} disabled={saving}>
                Guardar enlace
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">{socialLink.href}</p>
          )}
        </Card>
      ))}

      {validationMessage ? <p className="text-sm text-red-600">{validationMessage}</p> : null}
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
    </div>
  );
}
