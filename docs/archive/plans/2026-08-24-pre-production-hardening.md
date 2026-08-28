# Pre-Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the 6 findings surfaced during manual QA of the recently-shipped Content CMS restructure, so DentPro Colombia's site has no known open issues before its next push to production.

**Architecture:** Seven independent-but-related workstreams, sequenced so data-only fixes land first (cheap, unblock visual QA), then the Content/entity-merge follow-up (finishes what the prior plan started), then the booking-link wiring (depends on the specialists content pipeline), then the Users/Staff/Patients page unification (touches auth-gated admin routes), then motion (purely additive, safest to do last), then the footer credit (trivial, anywhere).

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 7 + Postgres (Neon), Tailwind v4, Phosphor Icons (`@/components/ui/Icon.tsx`), `motion` (Framer Motion successor package) — newly added in this plan.

## Global Constraints

- Locked blue-only palette (midnight/brand-teal/brand-indigo/brand-sky/accent-cyan/brand-light). No new colors except the pre-approved exceptions: red-error, emerald-success, amber-warning, rose-destructive.
- Icons ONLY from `@/components/ui/Icon.tsx` barrel, never direct `@phosphor-icons/react` imports.
- Spanish tú-form, sentence case, no exclamation marks except max 1 success message per page.
- Every new interactive element ships default/hover/focus-visible/active/disabled/loading states.
- Repo lives under OneDrive — if `npm run build`/`npm run dev` hits `EPERM` or a Turbopack panic (`0xc0000142`, "Failed to write app endpoint"), delete `.next` and retry once before treating it as a real failure.
- Work directly on `main` (no feature branches, established project convention). Commit after each task's verification passes.
- The database is the real production Neon instance, shared between local dev and prod — there is no separate local-only DB. Any data-migration script must be additive/update-only, never destructive, and must print before/after row counts. Never run a destructive statement without explicit user confirmation first.
- Verification gate for every code task: `npm run build && npm run typecheck && npm run lint`. Data-only tasks (scripts) use `npx prisma validate` where schema is touched, otherwise just the script's own printed output.
- `prefers-reduced-motion` must be respected by all new animation code (Part 4).

---

# Part 0 — Quick wins (data + trivial)

### Task 1: Migrate 3 default social links into real HomepageSocialLink rows

**Files:**
- Create: `scripts/migrate-default-social-links.mjs` (one-off, deleted after running)

**Interfaces:**
- Consumes: `prisma.homepageSocialLink` (Task 1 of the prior plan already added the `placements` field; the table is currently empty).

- [ ] **Step 1: Write the script**

```js
// scripts/migrate-default-social-links.mjs — one-off, deleted after running
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const before = await prisma.homepageSocialLink.count();
console.log(`Before: ${before} HomepageSocialLink rows.`);

const defaults = [
  { href: "https://www.instagram.com/dentprocol", label: "Instagram", iconKey: "InstagramLogo", sortOrder: 0 },
  { href: "https://www.facebook.com/dentprocol", label: "Facebook", iconKey: "FacebookLogo", sortOrder: 1 },
  { href: "https://www.tiktok.com/@dentprocol", label: "TikTok", iconKey: "TiktokLogo", sortOrder: 2 },
];

for (const item of defaults) {
  const existing = await prisma.homepageSocialLink.findFirst({ where: { href: item.href } });
  if (existing) {
    console.log(`Already exists, skipping: ${item.label}`);
    continue;
  }
  await prisma.homepageSocialLink.create({
    data: { ...item, placements: ["INFOBAR", "FOOTER"], isActive: true },
  });
  console.log(`Created: ${item.label}`);
}

const after = await prisma.homepageSocialLink.count();
console.log(`After: ${after} HomepageSocialLink rows.`);

await prisma.$disconnect();
await pool.end();
```

- [ ] **Step 2: Run it**

```bash
node --env-file=.env.local scripts/migrate-default-social-links.mjs
```

Confirm the output shows 3 "Created:" lines (or "Already exists" if re-run) and the after-count is 3.

- [ ] **Step 3: Delete the script**

```bash
rm scripts/migrate-default-social-links.mjs
```

- [ ] **Step 4: Commit**

Nothing to commit — this is a data-only operation with no code change, matching this repo's established convention for one-off migration scripts. Report the before/after counts in your task report.

---

### Task 2: Seed the 4 missing nav links into real HomepageNavLink rows

**Files:**
- Create: `scripts/migrate-default-nav-links.mjs` (one-off, deleted after running)

**Interfaces:**
- Consumes: `prisma.homepageNavLink` (currently has exactly 1 row: `{href: "#servicios", label: "Servicios", sortOrder: 0, isActive: true}`).

- [ ] **Step 1: Write the script**

```js
// scripts/migrate-default-nav-links.mjs — one-off, deleted after running
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const before = await prisma.homepageNavLink.count();
console.log(`Before: ${before} HomepageNavLink rows.`);

const defaults = [
  { href: "#especialistas", label: "Especialistas", sortOrder: 1 },
  { href: "#agenda", label: "Agenda", sortOrder: 2 },
  { href: "#preguntas-frecuentes", label: "FAQ", sortOrder: 3 },
  { href: "#contacto", label: "Contacto", sortOrder: 4 },
];

for (const item of defaults) {
  const existing = await prisma.homepageNavLink.findFirst({ where: { href: item.href } });
  if (existing) {
    console.log(`Already exists, skipping: ${item.label}`);
    continue;
  }
  await prisma.homepageNavLink.create({ data: { ...item, isActive: true } });
  console.log(`Created: ${item.label}`);
}

const after = await prisma.homepageNavLink.count();
console.log(`After: ${after} HomepageNavLink rows.`);

await prisma.$disconnect();
await pool.end();
```

- [ ] **Step 2: Run it**

```bash
node --env-file=.env.local scripts/migrate-default-nav-links.mjs
```

Confirm 4 "Created:" lines and after-count of 5 (1 existing + 4 new).

- [ ] **Step 3: Delete the script**

```bash
rm scripts/migrate-default-nav-links.mjs
```

- [ ] **Step 4: Commit**

Nothing to commit — data-only operation. Report before/after counts.

---

### Task 3: Add "Desarrollado por DOGBYTE" credit to the public footer

**Files:**
- Modify: `app/(marketing)/components/ContactSection.tsx:176-194`

**Interfaces:**
- Consumes: none new — pure JSX addition to the existing footer bar.

- [ ] **Step 1: Add the credit line**

In `ContactSection.tsx`, the footer bar currently renders (lines 176-194):

```tsx
      <div className="mt-20 border-t border-white/10 dark:border-surface-muted/80">
        <div className="container mx-auto flex flex-col gap-4 px-6 py-8 text-sm text-slate-400 transition-colors duration-300 dark:text-slate-500 md:flex-row md:items-center md:justify-between">
          <p className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white dark:bg-surface-muted/50">
              <Copyright className="h-4 w-4" weight="bold" aria-hidden="true" />
            </span>
            <span>
              {currentYear} {brand}. Todos los derechos reservados.
            </span>
          </p>
          <div className="flex gap-6">
            {legalLinks.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-white dark:hover:text-accent-cyan">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
```

Change the `<div className="flex gap-6">...</div>` block to add the credit line after the legal links, inside the same flex row so it sits on the right on desktop and stacks below on mobile:

```tsx
          <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:gap-6">
            {legalLinks.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-white dark:hover:text-accent-cyan">
                {link.label}
              </a>
            ))}
            <span className="text-slate-500 dark:text-slate-600">
              Desarrollado por{" "}
              <a
                href="https://dogbyte.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-slate-400 hover:text-white dark:text-slate-500 dark:hover:text-accent-cyan"
              >
                DOGBYTE
              </a>
            </span>
          </div>
```

Note: `href="https://dogbyte.dev"` is a placeholder domain — if DOGBYTE has a real website, the implementer should ask the user for the correct URL before hardcoding one; if not, keep it as plain text (`<span>DOGBYTE</span>`) with no link rather than link to a guessed domain.

- [ ] **Step 2: Verify**

`npm run build && npm run typecheck && npm run lint`. Manually load the homepage locally, scroll to the footer, confirm "Desarrollado por DOGBYTE" appears next to the legal links, sentence case, no new colors (uses existing `text-slate-400`/`text-slate-500` tokens already in this footer).

- [ ] **Step 3: Commit**

```bash
git add "app/(marketing)/components/ContactSection.tsx"
git commit -m "feat(marketing): add Desarrollado por DOGBYTE credit to footer"
```

---

# Part 1 — Servicios/Especialistas: listado editable dentro de Content

*(implements finding #25 — approved design: merge the real entity list into the existing "encabezado" panels, remove the now-redundant homepage fields from Servicios y tarifas / Staff)*

### Task 4: Extend AdminServicesCopyPanel with the real services list

**Files:**
- Modify: `app/portal/admin/content/AdminServicesCopyPanel.tsx` (full rewrite — currently 106 lines, title/description-only)

**Interfaces:**
- Consumes: `GET/PATCH /api/admin/homepage/settings` (unchanged, still owns `servicesTitle`/`servicesDescription`), `GET /api/services?pageSize=100` (existing route, returns `{data: ServiceRecord[]}` where `ServiceRecord` includes `id, name, description, priceCents, durationMinutes, active, specialtyId, iconKey, showOnHomepage, homepageSortOrder`), `PATCH /api/services/{id}` (existing route, accepts partial `{iconKey?, showOnHomepage?, homepageSortOrder?}`), `GET/POST/PATCH/DELETE /api/services/{id}/highlights[/{highlightId}][/reorder]` (existing routes, unchanged contract — see `app/portal/admin/services/AdminServicesPanel.tsx`'s `HighlightsSection` for the exact shape, reused here).
- Produces: `AdminServicesCopyPanel` component (no props), now titled "Servicios" — replaces its old title "Encabezado de servicios" in its own header text (the SIDEBAR label itself, from `ContentSidebar.tsx`, is updated separately in Task 22 of the prior plan's pattern — for THIS task only change the in-panel `<h2>` text, not the sidebar).

- [ ] **Step 1: Rewrite the component**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import type { MarketingIconKey } from "@/lib/marketing/homepage-types";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";
import { IconSelect } from "@/app/portal/admin/content/components/IconSelect";

type ServicesCopyForm = {
  servicesTitle: string;
  servicesDescription: string;
};

const EMPTY_FORM: ServicesCopyForm = { servicesTitle: "", servicesDescription: "" };

type SettingsApiResponse = {
  settings?: Partial<Record<keyof ServicesCopyForm, string | null>>;
  error?: string;
  details?: Array<{ path: string; message: string }>;
};

type ServiceRecord = {
  id: string;
  name: string;
  description?: string | null;
  active: boolean;
  iconKey?: string | null;
  showOnHomepage: boolean;
  homepageSortOrder: number;
};

type HighlightItem = { id: string; text: string; sortOrder: number };

export function AdminServicesCopyPanel() {
  const [form, setForm] = useState<ServicesCopyForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [rowSaving, setRowSaving] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(false);
  const [newHighlightText, setNewHighlightText] = useState("");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await fetchWithRetry("/api/admin/homepage/settings");
    const body = (await response.json().catch(() => null)) as SettingsApiResponse | null;
    if (!response.ok || !body?.settings) {
      setError(body?.error ?? "No se pudo cargar el encabezado de servicios.");
      setLoading(false);
      return;
    }
    setForm({
      servicesTitle: body.settings.servicesTitle ?? "",
      servicesDescription: body.settings.servicesDescription ?? "",
    });
    setLoading(false);
  }, []);

  const loadServices = useCallback(async () => {
    setServicesLoading(true);
    const response = await fetchWithRetry("/api/services?pageSize=100");
    if (response.ok) {
      const data = (await response.json()) as { data: ServiceRecord[] };
      setServices(data.data ?? []);
    }
    setServicesLoading(false);
  }, []);

  useEffect(() => {
    void loadSettings();
    void loadServices();
  }, [loadSettings, loadServices]);

  const onSaveHeader = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    const response = await fetchWithTimeout("/api/admin/homepage/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = (await response.json().catch(() => null)) as SettingsApiResponse | null;
    if (!response.ok) {
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudieron guardar los cambios.");
      setSaving(false);
      return;
    }
    setSuccess("Encabezado de servicios actualizado.");
    setSaving(false);
  };

  const patchService = async (id: string, patch: Partial<Pick<ServiceRecord, "iconKey" | "showOnHomepage" | "homepageSortOrder">>) => {
    setRowSaving(id);
    setRowError(null);
    const response = await fetchWithTimeout(`/api/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (response.ok) {
      setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setRowError(body?.error ?? "No se pudo actualizar el servicio.");
    }
    setRowSaving(null);
  };

  const loadHighlights = useCallback(async (serviceId: string) => {
    setHighlightsLoading(true);
    const response = await fetchWithRetry(`/api/services/${serviceId}/highlights`);
    if (response.ok) {
      const data = (await response.json()) as { highlights: HighlightItem[] };
      setHighlights(data.highlights ?? []);
    }
    setHighlightsLoading(false);
  }, []);

  const toggleExpanded = (service: ServiceRecord) => {
    if (expandedId === service.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(service.id);
    setNewHighlightText("");
    setHighlights([]);
    void loadHighlights(service.id);
  };

  const createHighlight = async (serviceId: string) => {
    const text = newHighlightText.trim();
    if (!text) return;
    setRowSaving(serviceId);
    const response = await fetchWithTimeout(`/api/services/${serviceId}/highlights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (response.ok) {
      setNewHighlightText("");
      await loadHighlights(serviceId);
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setRowError(body?.error ?? "No se pudo crear el highlight.");
    }
    setRowSaving(null);
  };

  const deleteHighlight = async (serviceId: string, highlightId: string) => {
    setRowSaving(serviceId);
    const response = await fetchWithTimeout(`/api/services/${serviceId}/highlights/${highlightId}`, { method: "DELETE" });
    if (response.ok) {
      await loadHighlights(serviceId);
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setRowError(body?.error ?? "No se pudo eliminar el highlight.");
    }
    setRowSaving(null);
  };

  if (loading) {
    return <p className="text-sm text-slate-600 dark:text-slate-300">Cargando servicios...</p>;
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Homepage CMS</p>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Servicios</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Título y descripción de la sección &ldquo;¿Qué hacemos?&rdquo;, y qué servicios reales se muestran ahí. Nombre,
          precio y duración se editan en Servicios y tarifas.
        </p>
      </section>

      <div className="grid gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-surface-muted/80 dark:bg-surface-elevated/80 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Título</span>
          <input className="input h-11 text-sm" value={form.servicesTitle} onChange={(e) => setForm((p) => ({ ...p, servicesTitle: e.target.value }))} disabled={saving} />
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Descripción</span>
          <textarea className="input min-h-28 text-sm" value={form.servicesDescription} onChange={(e) => setForm((p) => ({ ...p, servicesDescription: e.target.value }))} disabled={saving} />
        </label>
      </div>

      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p> : null}

      <button
        type="button"
        className="rounded-full bg-brand-teal px-5 py-2 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => void onSaveHeader()}
        disabled={saving}
      >
        {saving ? "Guardando..." : "Guardar encabezado"}
      </button>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Servicios en el sitio público
        </h3>

        {rowError ? <p className="text-sm text-red-600 dark:text-red-400">{rowError}</p> : null}

        {servicesLoading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Cargando servicios...</p>
        ) : services.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-surface-muted">
            No hay servicios registrados. Creá uno desde Servicios y tarifas.
          </p>
        ) : (
          <div className="space-y-3">
            {services.map((service) => (
              <div key={service.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-surface-muted/80 dark:bg-surface-elevated/80">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{service.name}</p>
                    {service.description ? <p className="text-xs text-slate-400">{service.description}</p> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <input
                        type="checkbox"
                        checked={service.showOnHomepage}
                        onChange={(e) => void patchService(service.id, { showOnHomepage: e.target.checked })}
                        disabled={rowSaving === service.id}
                      />
                      Mostrar en el sitio público
                    </label>
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-surface-muted dark:text-slate-200"
                      onClick={() => toggleExpanded(service)}
                    >
                      {expandedId === service.id ? "Cerrar" : "Editar"}
                    </button>
                  </div>
                </div>

                {expandedId === service.id ? (
                  <div className="mt-4 space-y-4 border-t border-slate-100 pt-4 dark:border-surface-muted">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Ícono
                        <div className="mt-2">
                          <IconSelect
                            value={(service.iconKey ?? "") as MarketingIconKey | ""}
                            onChange={(next) => void patchService(service.id, { iconKey: next })}
                            disabled={rowSaving === service.id}
                            allowEmpty
                          />
                        </div>
                      </label>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Orden en el sitio público
                        <input
                          className="input mt-2 h-11 text-sm"
                          type="number"
                          min={0}
                          value={service.homepageSortOrder}
                          onChange={(e) => void patchService(service.id, { homepageSortOrder: Number(e.target.value) || 0 })}
                          disabled={rowSaving === service.id}
                        />
                      </label>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Highlights</p>
                      {highlightsLoading ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Cargando highlights...</p>
                      ) : (
                        <>
                          {highlights.map((h) => (
                            <div key={h.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-surface-muted">
                              <span>{h.text}</span>
                              <button
                                type="button"
                                className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600"
                                onClick={() => void deleteHighlight(service.id, h.id)}
                                disabled={rowSaving === service.id}
                              >
                                Eliminar
                              </button>
                            </div>
                          ))}
                          <div className="flex gap-2">
                            <input
                              className="input h-10 flex-1 text-sm"
                              placeholder="Nuevo highlight"
                              value={newHighlightText}
                              onChange={(e) => setNewHighlightText(e.target.value)}
                              disabled={rowSaving === service.id}
                            />
                            <button
                              type="button"
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-surface-muted dark:text-slate-200"
                              onClick={() => void createHighlight(service.id)}
                              disabled={rowSaving === service.id}
                            >
                              Agregar
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

`npm run build && npm run typecheck && npm run lint`.

- [ ] **Step 3: Commit**

```bash
git add app/portal/admin/content/AdminServicesCopyPanel.tsx
git commit -m "feat(admin): merge editable services list into Content Servicios panel"
```

---

### Task 5: Remove homepage fields from Servicios y tarifas (ServiceModal)

**Files:**
- Modify: `app/portal/admin/services/AdminServicesPanel.tsx`

**Interfaces:**
- Consumes: none new.
- Produces: `ServiceModal` no longer renders the "Presencia en el sitio público" block (icon/showOnHomepage/order/highlights) — those fields are still sent by neither create nor update payload from this panel anymore. The `showOnHomepage` "Sitio público" badge in the service list row (lines 370-374) stays — it's a useful read-only indicator that content elsewhere controls, not something being removed.

- [ ] **Step 1: Remove the "Presencia en el sitio público" block from `ServiceModal`**

Delete this entire block (currently lines 630-675 in `AdminServicesPanel.tsx`):

```tsx
        <div className="mt-4 space-y-4 rounded-2xl border border-slate-100 p-4 dark:border-surface-muted">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
            Presencia en el sitio público
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            ...
          </div>

          {highlightsSection}
        </div>
```

Also remove the `highlightsSection` prop from `ServiceModal`'s props type and destructuring (it's now dead — the block that rendered it is gone), and remove the corresponding `highlightsSection={...}` JSX prop passed at the `<ServiceModal ... />` call site in the edit-modal render (around line 457-472).

- [ ] **Step 2: Remove now-unused state and handlers from `AdminServicesPanel`**

Remove: `editHighlights`, `setEditHighlights`, `highlightsLoading`, `setHighlightsLoading`, `newHighlightText`, `setNewHighlightText` state, and the `loadHighlights`, `createHighlight`, `editHighlightText`, `updateHighlight`, `deleteHighlight`, `reorderHighlights` functions, and the `HighlightsSection` component definition at the bottom of the file (it has no remaining callers). Remove the `loadHighlights(service.id)` call inside `openEdit`.

- [ ] **Step 3: Simplify `ServiceForm`/`emptyForm`**

Remove `iconKey`, `showOnHomepage`, `homepageSortOrder` from the `ServiceForm` type and `emptyForm` constant, and from `openEdit`'s `setEditForm({...})` call, and from `createService`/`updateService`'s request bodies (`iconKey: createForm.iconKey || null` etc. — those lines go away; the API route still accepts these fields as optional so omitting them from the payload is safe, existing values on the row are untouched by a PATCH/POST that doesn't include them).

Remove the now-unused `IconSelect`/`MarketingIconKey` imports if nothing else in the file uses them (check first — `IconSelect` is only used in the removed block).

- [ ] **Step 4: Verify**

`npm run build && npm run typecheck && npm run lint`. Manually open "Editar servicio" on a real service, confirm the modal now shows only Nombre/Descripción/Precio/Duración/Especialidad/Activo — no icon picker, no "sitio público" section, no highlights.

- [ ] **Step 5: Commit**

```bash
git add app/portal/admin/services/AdminServicesPanel.tsx
git commit -m "refactor(admin): remove homepage fields from Servicios y tarifas, now editable only from Content"
```

---

### Task 6: Extend AdminSpecialistsCopyPanel with the real specialists list

**Files:**
- Modify: `app/portal/admin/content/AdminSpecialistsCopyPanel.tsx` (full rewrite — currently 120 lines, title/description-only)

**Interfaces:**
- Consumes: `GET/PATCH /api/admin/homepage/settings` (unchanged, still owns `specialistsBadge`/`specialistsTitle`/`specialistsDescription`). New: `GET /api/professionals?pageSize=100` — read this route's existing response shape first (used already by `NewAppointmentForm.tsx`, returns `{data: Array<{id, user: {name, lastName}}>}`) and confirm whether it already includes `specialty`, `homepageBioShort`, `homepageImageUrl`, `homepageImageAlt`, `showOnHomepage`, `homepageSortOrder` fields — if not, this task must ALSO extend that route's Prisma `select`/response mapping to include them (read `app/api/professionals/route.ts` first). `PATCH /api/users/{id}` (existing route from the prior plan, already accepts `homepageBioShort`, `homepageImageUrl`, `homepageImageAlt`, `showOnHomepage`, `homepageSortOrder` as optional fields — see `app/api/users/[id]/route.ts:28-32` — but that route is keyed by `User.id`, not `ProfessionalProfile.id`; confirm which ID `GET /api/professionals` returns and use `professional.id` → look up the matching `userId` via the professional record's `user` relation, or check if the professionals list response includes `userId` directly).
- Produces: `AdminSpecialistsCopyPanel`, now titled "Equipo" — same list-with-inline-edit pattern as Task 4.

- [ ] **Step 1: Read the current API contract first**

Before writing the component, read `app/api/professionals/route.ts` in full to confirm: (a) exact response shape (does it include `userId`, `specialty.name`, and the 5 homepage fields already, or do you need to extend the Prisma `select`?), (b) whether `PATCH` on that route exists or whether the specialist's homepage fields must be saved via `PATCH /api/users/{userId}` instead (per the prior plan, `RoleModal.tsx` saved homepage fields via `PATCH /api/users/{user.id}` — the panel you're building should do the same, using the professional record's `userId`).

- [ ] **Step 2: Extend `GET /api/professionals` if needed**

If the route's current `select`/response doesn't already include `userId`, `specialty: {name}`, `homepageBioShort`, `homepageImageUrl`, `homepageImageAlt`, `showOnHomepage`, `homepageSortOrder`, add them to the Prisma query's `select` and the response mapping. Follow the existing code style in that file exactly (don't restructure unrelated parts of the route).

- [ ] **Step 3: Write the component**

Follow the exact same structural pattern as Task 4's `AdminServicesCopyPanel.tsx` (header form + `PATCH /api/admin/homepage/settings` unchanged, then a list section below), adapted for professionals:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";
import { AdminImageField } from "@/app/portal/admin/content/components/AdminImageField";

type SpecialistsCopyForm = {
  specialistsBadge: string;
  specialistsTitle: string;
  specialistsDescription: string;
};

const EMPTY_FORM: SpecialistsCopyForm = { specialistsBadge: "", specialistsTitle: "", specialistsDescription: "" };

type SettingsApiResponse = {
  settings?: Partial<Record<keyof SpecialistsCopyForm, string | null>>;
  error?: string;
  details?: Array<{ path: string; message: string }>;
};

type ProfessionalRecord = {
  id: string;
  userId: string;
  user: { name: string; lastName: string };
  specialty?: { name: string } | null;
  homepageBioShort?: string | null;
  homepageImageUrl?: string | null;
  homepageImageAlt?: string | null;
  showOnHomepage: boolean;
  homepageSortOrder: number;
};

export function AdminSpecialistsCopyPanel() {
  const [form, setForm] = useState<SpecialistsCopyForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [professionals, setProfessionals] = useState<ProfessionalRecord[]>([]);
  const [professionalsLoading, setProfessionalsLoading] = useState(true);
  const [rowSaving, setRowSaving] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ bio: string; imageUrl: string; imageAlt: string; sortOrder: string }>({
    bio: "",
    imageUrl: "",
    imageAlt: "",
    sortOrder: "0",
  });

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await fetchWithRetry("/api/admin/homepage/settings");
    const body = (await response.json().catch(() => null)) as SettingsApiResponse | null;
    if (!response.ok || !body?.settings) {
      setError(body?.error ?? "No se pudo cargar el encabezado de especialistas.");
      setLoading(false);
      return;
    }
    setForm({
      specialistsBadge: body.settings.specialistsBadge ?? "",
      specialistsTitle: body.settings.specialistsTitle ?? "",
      specialistsDescription: body.settings.specialistsDescription ?? "",
    });
    setLoading(false);
  }, []);

  const loadProfessionals = useCallback(async () => {
    setProfessionalsLoading(true);
    const response = await fetchWithRetry("/api/professionals?pageSize=100");
    if (response.ok) {
      const data = (await response.json()) as { data: ProfessionalRecord[] };
      setProfessionals(data.data ?? []);
    }
    setProfessionalsLoading(false);
  }, []);

  useEffect(() => {
    void loadSettings();
    void loadProfessionals();
  }, [loadSettings, loadProfessionals]);

  const onSaveHeader = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    const response = await fetchWithTimeout("/api/admin/homepage/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = (await response.json().catch(() => null)) as SettingsApiResponse | null;
    if (!response.ok) {
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudieron guardar los cambios.");
      setSaving(false);
      return;
    }
    setSuccess("Encabezado de especialistas actualizado.");
    setSaving(false);
  };

  const toggleShowOnHomepage = async (professional: ProfessionalRecord, next: boolean) => {
    setRowSaving(professional.userId);
    setRowError(null);
    const response = await fetchWithTimeout(`/api/users/${professional.userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showOnHomepage: next }),
    });
    if (response.ok) {
      setProfessionals((prev) => prev.map((p) => (p.userId === professional.userId ? { ...p, showOnHomepage: next } : p)));
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setRowError(body?.error ?? "No se pudo actualizar.");
    }
    setRowSaving(null);
  };

  const openEditor = (professional: ProfessionalRecord) => {
    if (expandedUserId === professional.userId) {
      setExpandedUserId(null);
      return;
    }
    setExpandedUserId(professional.userId);
    setDraft({
      bio: professional.homepageBioShort ?? "",
      imageUrl: professional.homepageImageUrl ?? "",
      imageAlt: professional.homepageImageAlt ?? "",
      sortOrder: String(professional.homepageSortOrder ?? 0),
    });
  };

  const saveDraft = async (professional: ProfessionalRecord) => {
    setRowSaving(professional.userId);
    setRowError(null);
    const response = await fetchWithTimeout(`/api/users/${professional.userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        homepageBioShort: draft.bio,
        homepageImageUrl: draft.imageUrl,
        homepageImageAlt: draft.imageAlt,
        homepageSortOrder: Number(draft.sortOrder) || 0,
      }),
    });
    if (response.ok) {
      setProfessionals((prev) =>
        prev.map((p) =>
          p.userId === professional.userId
            ? { ...p, homepageBioShort: draft.bio, homepageImageUrl: draft.imageUrl, homepageImageAlt: draft.imageAlt, homepageSortOrder: Number(draft.sortOrder) || 0 }
            : p,
        ),
      );
      setExpandedUserId(null);
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setRowError(body?.error ?? "No se pudo guardar.");
    }
    setRowSaving(null);
  };

  if (loading) {
    return <p className="text-sm text-slate-600 dark:text-slate-300">Cargando equipo...</p>;
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Homepage CMS</p>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Equipo</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Badge, título y descripción del bloque de especialistas, y quién se muestra en el sitio público. Rol y
          especialidad se editan en Staff.
        </p>
      </section>

      <div className="grid gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-surface-muted/80 dark:bg-surface-elevated/80 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Badge (eyebrow)</span>
          <input
            className="input h-11 text-sm"
            placeholder="EQUIPO CLÍNICO"
            value={form.specialistsBadge}
            onChange={(e) => setForm((p) => ({ ...p, specialistsBadge: e.target.value }))}
            disabled={saving}
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Título</span>
          <input className="input h-11 text-sm" value={form.specialistsTitle} onChange={(e) => setForm((p) => ({ ...p, specialistsTitle: e.target.value }))} disabled={saving} />
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Descripción</span>
          <textarea className="input min-h-28 text-sm" value={form.specialistsDescription} onChange={(e) => setForm((p) => ({ ...p, specialistsDescription: e.target.value }))} disabled={saving} />
        </label>
      </div>

      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p> : null}

      <button
        type="button"
        className="rounded-full bg-brand-teal px-5 py-2 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => void onSaveHeader()}
        disabled={saving}
      >
        {saving ? "Guardando..." : "Guardar encabezado"}
      </button>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Equipo en el sitio público
        </h3>

        {rowError ? <p className="text-sm text-red-600 dark:text-red-400">{rowError}</p> : null}

        {professionalsLoading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Cargando equipo...</p>
        ) : professionals.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-surface-muted">
            No hay profesionales registrados. Creá uno desde Staff.
          </p>
        ) : (
          <div className="space-y-3">
            {professionals.map((professional) => (
              <div key={professional.userId} className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-surface-muted/80 dark:bg-surface-elevated/80">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {professional.user.name} {professional.user.lastName}
                    </p>
                    {professional.specialty?.name ? <p className="text-xs text-slate-400">{professional.specialty.name}</p> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <input
                        type="checkbox"
                        checked={professional.showOnHomepage}
                        onChange={(e) => void toggleShowOnHomepage(professional, e.target.checked)}
                        disabled={rowSaving === professional.userId}
                      />
                      Mostrar en el sitio público
                    </label>
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-surface-muted dark:text-slate-200"
                      onClick={() => openEditor(professional)}
                    >
                      {expandedUserId === professional.userId ? "Cerrar" : "Editar"}
                    </button>
                  </div>
                </div>

                {expandedUserId === professional.userId ? (
                  <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-surface-muted">
                    <textarea
                      className="input min-h-24 text-sm"
                      placeholder="Bio corta para el sitio público"
                      value={draft.bio}
                      onChange={(e) => setDraft((p) => ({ ...p, bio: e.target.value }))}
                      maxLength={600}
                      disabled={rowSaving === professional.userId}
                    />
                    <AdminImageField
                      label="Imagen para el sitio público"
                      value={draft.imageUrl}
                      onChange={(value) => setDraft((p) => ({ ...p, imageUrl: value }))}
                      uploadFolder="marketing/specialists"
                      recommendation="1200x1500 px"
                      aspectRatio="4:5"
                      placeholder="https://..."
                      disabled={rowSaving === professional.userId}
                    />
                    <input
                      className="input h-11 text-sm"
                      placeholder="Texto alternativo de la imagen"
                      value={draft.imageAlt}
                      onChange={(e) => setDraft((p) => ({ ...p, imageAlt: e.target.value }))}
                      maxLength={180}
                      disabled={rowSaving === professional.userId}
                    />
                    <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Orden
                      <input
                        type="number"
                        min={0}
                        className="input h-9 w-20 text-sm"
                        value={draft.sortOrder}
                        onChange={(e) => setDraft((p) => ({ ...p, sortOrder: e.target.value }))}
                        disabled={rowSaving === professional.userId}
                      />
                    </label>
                    <button
                      type="button"
                      className="rounded-full bg-brand-teal px-3 py-1.5 text-xs font-semibold uppercase text-white disabled:opacity-60"
                      onClick={() => void saveDraft(professional)}
                      disabled={rowSaving === professional.userId}
                    >
                      {rowSaving === professional.userId ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

`npm run build && npm run typecheck && npm run lint`. Manually toggle "Mostrar en el sitio público" for one professional, confirm the public homepage's Especialistas slider reflects it after reload.

- [ ] **Step 5: Commit**

```bash
git add app/portal/admin/content/AdminSpecialistsCopyPanel.tsx app/api/professionals/route.ts
git commit -m "feat(admin): merge editable specialists list into Content Equipo panel"
```

---

### Task 7: Remove "Presencia en el sitio público" from RoleModal (Staff)

**Files:**
- Modify: `app/portal/admin/users/RoleModal.tsx`

**Interfaces:**
- Consumes: none new.
- Produces: `RoleModal` no longer renders the homepage-presence section (bio/image/alt/showOnHomepage/order) for PROFESIONAL rows — that's now Task 6's job, from Content. `RoleModalUser.professional`'s homepage-field properties in the type can stay (harmless, just no longer read/rendered by this component) — do NOT touch `app/api/users/[id]/route.ts`, its schema still needs those fields since Task 6's new panel uses the SAME endpoint.

- [ ] **Step 1: Remove the "Presencia en el sitio público" section**

Delete this entire block (currently lines 496-566 in `RoleModal.tsx`):

```tsx
          {role === "PROFESIONAL" && professionalId ? (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Presencia en el sitio público
              </p>
              ...
            </section>
          ) : null}
```

- [ ] **Step 2: Remove now-unused state and handler**

Remove `homepageBioShort`, `homepageImageUrl`, `homepageImageAlt`, `showOnHomepage`, `homepageSortOrder`, `homepageStatus`, `homepageError` state (lines 92-98) and the `handleSaveHomepage` function (lines 185-214). Remove the now-unused `AdminImageField` import if nothing else in the file uses it (check first).

- [ ] **Step 3: Verify**

`npm run build && npm run typecheck && npm run lint`. Manually open "Cambiar rol" on a professional, confirm no "Presencia en el sitio público" section appears — only Rol, Especialidad, Servicios que ofrece.

- [ ] **Step 4: Commit**

```bash
git add app/portal/admin/users/RoleModal.tsx
git commit -m "refactor(admin): remove homepage presence fields from RoleModal, now editable only from Content"
```

---

# Part 2 — Botón "Reservar cita" vinculado al profesional

*(implements finding #4 — the specialist card's CTA currently links to a generic, unparameterized booking form)*

### Task 8: Add `id` to HomepageSpecialistContent and populate it

**Files:**
- Modify: `lib/marketing/homepage-types.ts:37-45`
- Modify: `lib/marketing/homepage.ts` (the specialists mapping — find where `HomepageSpecialistContent` objects are constructed, in the `professionals.map(...)` block added by the prior plan's Task 16)
- Modify: `lib/marketing/homepage-defaults.ts` (the specialists fallback array, if it exists with hardcoded entries — add an `id` field to each; check the actual current default entries first since they may not include one)

**Interfaces:**
- Consumes: `ProfessionalProfile.id` (the real DB primary key, already available in the query that builds this mapping since Task 16 of the prior plan already selects `professional.id` implicitly via the Prisma `findMany` — verify by reading the current query).
- Produces: `HomepageSpecialistContent` gains `id: string`, threaded through to `SpecialistCard`.

- [ ] **Step 1: Add `id` to the type**

In `lib/marketing/homepage-types.ts:37-45`:

```ts
export type HomepageSpecialistContent = {
  id: string;
  name: string;
  specialty: string;
  description: string;
  image: {
    src: string;
    alt: string;
  };
};
```

- [ ] **Step 2: Populate it in `homepage.ts`**

Find the specialists mapping in `lib/marketing/homepage.ts` (added by the prior plan's Task 16, reads `professionals.map((p) => ({...}))`). Add `id: p.id,` as the first field in the mapped object — `p` here is a `ProfessionalProfile` row from the `prisma.professionalProfile.findMany(...)` query, so `p.id` is the professional's own ID (this is what `NewAppointmentForm.tsx`'s `professionalId` state expects — confirmed by reading that form's `Professional` type: `{id: string; user: {...}}`, matching `ProfessionalProfile.id`, not `User.id`).

- [ ] **Step 3: Add `id` to the fallback defaults**

Read the current specialists fallback array in `lib/marketing/homepage-defaults.ts`. If it has hardcoded specialist entries without an `id` field, add a stable placeholder id to each (e.g. `id: "fallback-1"`, `id: "fallback-2"`) — these fallback entries never link to a real booking flow with a real professional anyway (there's no real DB row behind them), so the booking link for a fallback card should gracefully fall through to the generic `/appointments/new` with no `professionalId` param (handled naturally since Task 9's `SpecialistCard` will just build a link with whatever `id` it receives — a fallback id like `"fallback-1"` sent as `?professionalId=fallback-1` would 404/no-op harmlessly in `NewAppointmentForm`'s dropdown since it won't match any real professional; acceptable degradation for a fallback-only, no-real-data scenario, not worth extra guard logic).

- [ ] **Step 4: Verify**

`npm run typecheck`. Confirm no other consumer of `HomepageSpecialistContent` breaks (check `SpecialistCard` in `SpecialistsSlider.tsx` — Task 9 updates it next).

- [ ] **Step 5: Commit**

```bash
git add lib/marketing/homepage-types.ts lib/marketing/homepage.ts lib/marketing/homepage-defaults.ts
git commit -m "feat(marketing): add id to HomepageSpecialistContent"
```

---

### Task 9: SpecialistsSlider passes professionalId in the booking link

**Files:**
- Modify: `app/(marketing)/components/SpecialistsSlider.tsx`

**Interfaces:**
- Consumes: `HomepageSpecialistContent.id` from Task 8.

- [ ] **Step 1: Update the `SpecialistCard` interface and the link**

In `SpecialistsSlider.tsx:10-18`, add `id: string;` to the `SpecialistCard` interface:

```ts
interface SpecialistCard {
  id: string;
  name: string;
  specialty: string;
  description: string;
  image: {
    src: string;
    alt: string;
  };
}
```

Change the `key={specialist.name}` on line 70 to `key={specialist.id}` (more correct/stable than name), and the `key={s.name}` on line 101 (dot indicators) to `key={s.id}`.

Change the booking link (line 86) from:

```tsx
<Link href="/appointments/new" className="btn-secondary w-full justify-center text-sm">
  Reservar cita
</Link>
```

to:

```tsx
<Link href={`/appointments/new?professionalId=${specialist.id}`} className="btn-secondary w-full justify-center text-sm">
  Reservar cita
</Link>
```

- [ ] **Step 2: Verify**

`npm run build && npm run typecheck && npm run lint`. Manually load the homepage, click "Reservar cita" on a specialist card, confirm the URL carries `?professionalId=<real-uuid>`.

- [ ] **Step 3: Commit**

```bash
git add "app/(marketing)/components/SpecialistsSlider.tsx"
git commit -m "feat(marketing): link specialist card booking button to the professional"
```

---

### Task 10: NewAppointmentForm reads professionalId from the URL

**Files:**
- Modify: `app/appointments/new/NewAppointmentForm.tsx`

**Interfaces:**
- Consumes: `useSearchParams` from `next/navigation`.
- Produces: `professionalId` state initializes from `?professionalId=` if present, instead of always starting empty.

- [ ] **Step 1: Read searchParams and pre-select**

In `NewAppointmentForm.tsx`, add the import:

```ts
import { useSearchParams } from "next/navigation";
```

Inside the component function, after the existing `useState` declarations, add:

```ts
const searchParams = useSearchParams();
const preselectedProfessionalId = searchParams.get("professionalId") ?? "";
```

Change the `professionalId` state initialization (line 34) from:

```ts
const [professionalId, setProfessionalId] = useState("");
```

to:

```ts
const [professionalId, setProfessionalId] = useState(preselectedProfessionalId);
```

Note: this only pre-fills on initial mount (correct behavior — the form's own `serviceId`-change effect at lines 57-60 already resets `professionalId` to `""` when the user manually changes the service, which is fine since that's user-driven, not a re-read of the URL).

Note on `app/appointments/new/page.tsx`: this component is used by a client component tree — verify (read `app/appointments/new/page.tsx`) whether `NewAppointmentForm` is already rendered inside a component that itself is a Client Component or Server Component boundary compatible with `useSearchParams` (which requires either the component itself or an ancestor to allow it — `useSearchParams` triggers a client-side-only read and requires the nearest Suspense boundary; since `NewAppointmentForm.tsx` already starts with `"use client"` at the top, and `useSearchParams` is a standard client hook, this should work without additional Suspense wrapping in Next 16's App Router as long as the page itself doesn't force fully-static rendering — if `npm run build` reports a "should be wrapped in a suspense boundary" warning/error for this route, wrap the `<NewAppointmentForm />` usage in `page.tsx` with `<Suspense fallback={...}>`).

- [ ] **Step 2: Verify**

`npm run build && npm run typecheck && npm run lint`. If build reports a Suspense boundary requirement for `/appointments/new`, add the wrapper per the note above and rebuild. Manually navigate to `/appointments/new?professionalId=<a-real-professional-id-from-the-DB>` and confirm the "Profesional" dropdown shows that professional pre-selected.

- [ ] **Step 3: Commit**

```bash
git add app/appointments/new/NewAppointmentForm.tsx
git commit -m "feat(booking): pre-select professional from URL query param"
```

---

# Part 3 — Unificar Users/Staff/Patients

*(implements finding #27 — collapse the 3 admin pages into one, with a role-adaptive edit experience. `/portal/receptionist/patients` is untouched — it's the RECEPCIONISTA role's own separate page.)*

### Task 11: Open ClinicalHistoryPanel access to ADMINISTRADOR

**Files:**
- Modify: `lib/clinical/access.ts`
- Modify: `app/portal/professional/patients/[id]/page.tsx`

**Interfaces:**
- Consumes: none new.
- Produces: `professionalHasPatientAccess` unchanged in signature — a NEW function `adminHasPatientAccess` (or the page's own inline check) grants ADMINISTRADOR unconditional access, since admins aren't scoped to "my patients" the way professionals are.

- [ ] **Step 1: Read `ClinicalHistoryPanel.tsx` in full first**

Before making any change, read `app/portal/professional/patients/[id]/ClinicalHistoryPanel.tsx` (509 lines) in full to confirm it has no internal API calls or UI copy that assumes the viewer is specifically a PROFESIONAL (e.g., a "mis pacientes" label, or an API call scoped by the logged-in professional's own ID rather than the `patientId` prop it receives). It receives `patientId` as its only prop (confirmed from `page.tsx:63`), so it should be role-agnostic internally — but verify this assumption holds before proceeding; if it makes any professional-scoped API call, note it in your task report and adjust that call to also accept an admin session (same principle as this task's `page.tsx` change).

- [ ] **Step 2: Update `app/portal/professional/patients/[id]/page.tsx`'s access check**

Current gate (lines 8, 27-34):

```tsx
export default async function ProfessionalPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("PROFESIONAL");
  ...
  const professional = await getProfessionalProfile(prisma, session.user?.id ?? "");
  const allowed = professional
    ? await professionalHasPatientAccess(prisma, professional, patient.id)
    : false;

  if (!allowed) {
    return <p className="text-sm text-slate-500">No tienes permisos para ver este paciente.</p>;
  }
```

This task does NOT need to change this specific route (it stays PROFESIONAL-only, unchanged) — Task 12 builds a NEW admin-facing entry point that reuses `ClinicalHistoryPanel` directly with its own access check, rather than routing admins through this professional-specific page. Skip modifying this file; it's listed here only so the implementer reads it as reference for the access-check pattern to replicate in Task 12.

Revise this task's scope: no file changes in this task. Read `lib/clinical/access.ts` and confirm `professionalHasPatientAccess`'s two DB checks (`Appointment` match or `ClinicalEpisode` match) — Task 12 will need a parallel `ADMINISTRADOR`-unconditional path, not a modification to this function (admins see ALL patients, not just ones with a matching appointment/episode to a specific professional — reusing this function for admins would incorrectly scope them).

- [ ] **Step 3: No commit for this task**

This task is research-only, feeding Task 12. Report your findings (any professional-scoped assumptions found in `ClinicalHistoryPanel.tsx`) in your task report so Task 12's implementer (or you, if continuing) has them.

---

### Task 12: Build PatientDetailModal (large modal wrapping ClinicalHistoryPanel)

**Files:**
- Create: `app/portal/admin/users/PatientDetailModal.tsx`
- Create: `app/api/admin/patients/[id]/route.ts` (new admin-scoped API route — `GET` returns patient basic info + clinical access check, reusing the same DB queries `page.tsx` used for the professional-facing version, but gated on `ADMINISTRADOR` instead of per-professional access)

**Interfaces:**
- Consumes: `ClinicalHistoryPanel` from `app/portal/professional/patients/[id]/ClinicalHistoryPanel.tsx` (imported directly — do not duplicate it), `PatientProfile` fields (`id, patientCode, documentId, phone, user: {name, lastName}`).
- Produces: `PatientDetailModal({patientId, onClose}: {patientId: string; onClose: () => void})` — a full-screen (or near-full-screen) modal component. `GET /api/admin/patients/{patientProfileId}` → `{patient: {id, patientCode, documentId, phone, user: {name, lastName}}}` or 403/404.

- [ ] **Step 1: Create the admin-scoped API route**

```ts
// app/api/admin/patients/[id]/route.ts
import { NextResponse } from "next/server";

import { errorResponse } from "@/app/api/_utils/response";
import { getPrismaClient } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/authz";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse("No tienes permisos para ver esta ficha.", 403);
  }

  const { id } = await params;
  const prisma = getPrismaClient();

  const patient = await prisma.patientProfile.findUnique({
    where: { id },
    select: {
      id: true,
      patientCode: true,
      documentId: true,
      phone: true,
      user: { select: { name: true, lastName: true } },
    },
  });

  if (!patient) {
    return errorResponse("Paciente no encontrado.", 404);
  }

  return NextResponse.json({ patient });
}
```

Note: read `lib/authz.ts` first to confirm `requireSession`/`requireRole`'s exact exported signatures match this usage (this mirrors the pattern already used in `app/api/users/[id]/route.ts`, which imports the same two functions — verify parity before finalizing).

- [ ] **Step 2: Create the modal component**

```tsx
// app/portal/admin/users/PatientDetailModal.tsx
"use client";

import { useEffect, useState } from "react";

import { fetchWithRetry } from "@/lib/http";
import { useModalDialog } from "@/app/portal/components/ui/useModalDialog";
import { ClinicalHistoryPanel } from "@/app/portal/professional/patients/[id]/ClinicalHistoryPanel";

type PatientDetail = {
  id: string;
  patientCode: string | null;
  documentId: string | null;
  phone: string | null;
  user: { name: string; lastName: string };
};

export function PatientDetailModal({ patientId, onClose }: { patientId: string; onClose: () => void }) {
  const containerRef = useModalDialog(onClose);
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchWithRetry(`/api/admin/patients/${patientId}`)
      .then(async (response) => {
        if (cancelled) return;
        const body = (await response.json().catch(() => null)) as { patient?: PatientDetail; error?: string } | null;
        if (!response.ok || !body?.patient) {
          setError(body?.error ?? "No se pudo cargar la ficha del paciente.");
          setLoading(false);
          return;
        }
        setPatient(body.patient);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError("No pudimos conectar con el servidor.");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-detail-modal-title"
        className="flex h-full max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-surface-elevated"
      >
        <div className="flex items-start justify-between border-b border-slate-100 p-6 dark:border-surface-muted">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ficha del paciente</p>
            <h3 id="patient-detail-modal-title" className="text-lg font-semibold text-slate-900 dark:text-white">
              {loading ? "Cargando..." : patient ? `${patient.user.name} ${patient.user.lastName}` : "Paciente"}
            </h3>
            {patient ? (
              <p className="text-sm text-slate-500 dark:text-slate-300">
                Documento: {patient.documentId ?? "Sin documento"} · Teléfono: {patient.phone ?? "Sin teléfono"}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 dark:border-surface-muted"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          {loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Cargando historial clínico...</p> : null}
          {patient ? <ClinicalHistoryPanel patientId={patient.id} /> : null}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

`npm run build && npm run typecheck && npm run lint`. This component isn't wired into anything yet (Task 13 does that) — build/typecheck passing on its own is sufficient for this task.

- [ ] **Step 4: Commit**

```bash
git add app/portal/admin/users/PatientDetailModal.tsx app/api/admin/patients/\[id\]/route.ts
git commit -m "feat(admin): add PatientDetailModal reusing ClinicalHistoryPanel for admin access"
```

---

### Task 13: Wire PatientDetailModal into AdminUsersPanel for PACIENTE rows

**Files:**
- Modify: `app/portal/admin/users/AdminUsersPanel.tsx`

**Interfaces:**
- Consumes: `PatientDetailModal` from Task 12.
- Produces: clicking "Editar"/"Cambiar rol" on a user whose `role === "PACIENTE"` opens `PatientDetailModal` instead of `RoleModal`; all other roles keep opening `RoleModal` exactly as today.

- [ ] **Step 1: Fetch the patient's `PatientProfile.id`, not just `User.id`**

`AdminUsersPanel`'s `UserRecord` type (lines 12-31) already has `patient?: {phone?: string | null; documentId?: string | null} | null` — but no `id` for the `PatientProfile` row itself. `PatientDetailModal`/the new API route need the `PatientProfile.id` (not `User.id`). Check `GET /api/users` (the route backing this panel's list) — read `app/api/users/route.ts` first to see if `patient.id` is already selected; if not, add `id: true` to the `patient` sub-select in that route's Prisma query, and add `id?: string;` to `UserRecord.patient`'s type in `AdminUsersPanel.tsx`.

- [ ] **Step 2: Add the conditional modal branch**

Import `PatientDetailModal`:

```ts
import { PatientDetailModal } from "./PatientDetailModal";
```

Add state for it, near the existing `roleModalUserId` state (line 165):

```ts
const [patientDetailUserId, setPatientDetailUserId] = useState<string | null>(null);
```

Change the "Cambiar rol" button's `onClick` (line 520) from always `setRoleModalUserId(user.id)` to branch on role:

```tsx
<button
  type="button"
  className="rounded-full border border-brand-teal px-3 py-1 text-xs font-semibold uppercase text-brand-teal"
  onClick={() => {
    if (user.role === "PACIENTE" && user.patient?.id) {
      setPatientDetailUserId(user.patient.id);
    } else {
      setRoleModalUserId(user.id);
    }
  }}
  disabled={saving}
>
  {user.role === "PACIENTE" ? "Ver ficha" : "Cambiar rol"}
</button>
```

Add the render branch near the existing `{roleModalUser ? (<RoleModal .../>) : null}` block (line 596):

```tsx
{patientDetailUserId ? (
  <PatientDetailModal patientId={patientDetailUserId} onClose={() => setPatientDetailUserId(null)} />
) : null}
```

- [ ] **Step 3: Verify**

`npm run build && npm run typecheck && npm run lint`. Manually go to `/portal/admin/users`, filter by rol "Paciente", click "Ver ficha" on a patient, confirm the large modal opens showing their clinical history panel (episodios clínicos etc.), and confirm clicking "Cambiar rol" on a PROFESIONAL/RECEPCIONISTA/ADMINISTRADOR row still opens the normal small `RoleModal`.

- [ ] **Step 4: Commit**

```bash
git add app/portal/admin/users/AdminUsersPanel.tsx app/api/users/route.ts
git commit -m "feat(admin): open PatientDetailModal for PACIENTE rows in Users"
```

---

### Task 14: Redirect /portal/admin/staff and /portal/admin/patients to /portal/admin/users

**Files:**
- Modify: `app/portal/admin/staff/page.tsx`
- Modify: `app/portal/admin/patients/page.tsx`
- Delete: `app/portal/admin/professionals/AdminProfessionalsPanel.tsx` (and the now-empty `app/portal/admin/professionals/` directory, if nothing else lives in it — check first)

**Interfaces:**
- Consumes: `redirect` from `next/navigation`.
- Produces: both routes 302-redirect into the unified `/portal/admin/users` page with a role filter pre-applied via query param, preserving old bookmarks/links instead of 404ing.

- [ ] **Step 1: Check `AdminUsersPanel`'s query-param support first**

Read the current `/portal/admin/users/page.tsx` (find it — likely `app/portal/admin/users/page.tsx`) to see whether it already reads a `?role=` search param and passes it as `roleFilter` to `<AdminUsersPanel>`. If not, add that: read `searchParams` in the page's server component, extract `role` if present and valid (one of `PACIENTE`/`PROFESIONAL`/`RECEPCIONISTA`/`ADMINISTRADOR`), and pass it as the `roleFilter` prop.

- [ ] **Step 2: Replace `app/portal/admin/staff/page.tsx` with a redirect**

```tsx
import { redirect } from "next/navigation";

export default function AdminStaffPage() {
  redirect("/portal/admin/users?role=PROFESIONAL");
}
```

- [ ] **Step 3: Replace `app/portal/admin/patients/page.tsx` with a redirect**

```tsx
import { redirect } from "next/navigation";

export default function AdminPatientsPage() {
  redirect("/portal/admin/users?role=PACIENTE");
}
```

- [ ] **Step 4: Delete the now-unused `AdminProfessionalsPanel`**

```bash
grep -rn "AdminProfessionalsPanel" app/ --include="*.tsx" --include="*.ts"
```

If the only remaining reference is the file's own definition (the `staff/page.tsx` import was just removed in Step 2), delete it:

```bash
rm app/portal/admin/professionals/AdminProfessionalsPanel.tsx
rmdir app/portal/admin/professionals 2>/dev/null || true
```

- [ ] **Step 5: Verify**

`npm run build && npm run typecheck && npm run lint`. Manually navigate to `/portal/admin/staff` and confirm it redirects to `/portal/admin/users?role=PROFESIONAL` with the role tab pre-selected; same for `/portal/admin/patients` → `?role=PACIENTE`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(admin): collapse Staff and Patients pages into redirects to unified Users"
```

---

# Part 4 — Animación y motion en el sitio público

*(implements finding #28 — approved: `motion` package, scroll-reveals + micro-interactions + Hero parallax + section stagger, respecting `prefers-reduced-motion`)*

### Task 15: Install `motion` and create shared animation primitives

**Files:**
- Modify: `package.json` (add dependency)
- Create: `lib/motion/variants.ts`

**Interfaces:**
- Produces: `fadeUpVariant`, `staggerContainerVariant` — reusable Framer Motion variant objects; both read `prefers-reduced-motion` at usage time via the `useReducedMotion` hook (each consuming component checks it, not baked into the shared variants themselves, since the hook must be called inside a component).

- [ ] **Step 1: Install the package**

```bash
npm install motion
```

- [ ] **Step 2: Create shared variants**

```ts
// lib/motion/variants.ts
import type { Variants } from "motion/react";

export const fadeUpVariant: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export const fadeUpVariantReduced: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

export const staggerContainerVariant: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export const staggerItemVariant: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};
```

- [ ] **Step 3: Verify**

`npm run typecheck` (confirm the `motion/react` types resolve — this is a types-only file so far, nothing renders yet).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json lib/motion/variants.ts
git commit -m "feat(motion): install motion package, add shared animation variants"
```

---

### Task 16: Scroll-reveal on Services and Specialists sections

**Files:**
- Modify: `app/(marketing)/components/Services.tsx`
- Modify: `app/(marketing)/components/SpecialistsSlider.tsx`

**Interfaces:**
- Consumes: `fadeUpVariant`, `fadeUpVariantReduced`, `staggerContainerVariant`, `staggerItemVariant` from `lib/motion/variants.ts`.

- [ ] **Step 1: Add scroll-reveal to `Services.tsx`**

Add the `"use client"` directive is already present (line 1). Add imports:

```ts
import { motion, useReducedMotion } from "motion/react";

import { fadeUpVariant, fadeUpVariantReduced, staggerContainerVariant, staggerItemVariant } from "@/lib/motion/variants";
```

Change the header block (lines 38-42) from a plain `<div>` to a `motion.div` with `whileInView`:

```tsx
        <motion.div
          className="max-w-2xl"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={prefersReducedMotion ? fadeUpVariantReduced : fadeUpVariant}
        >
          {badge ? <p className="badge mb-4 w-fit">{badge}</p> : null}
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{title}</h2>
          <p className="mt-4 text-base text-slate-500 dark:text-slate-300">{description}</p>
        </motion.div>
```

Add `const prefersReducedMotion = useReducedMotion();` inside the component function, before the `return`.

Change the grid container (line 43) to a `motion.div` driving staggered children:

```tsx
        <motion.div
          className="mt-12 grid gap-8 sm:grid-cols-2 xl:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={staggerContainerVariant}
        >
          {services.map((service) => {
            ...
            return (
              <motion.article key={service.id} className="card flex flex-col gap-4" variants={prefersReducedMotion ? fadeUpVariantReduced : staggerItemVariant}>
                ...
              </motion.article>
            );
          })}
        </motion.div>
```

(Replace the outer `<div className="mt-12 grid...">` and inner `<article ...>` tags with the `motion.div`/`motion.article` versions shown, keeping every existing prop/className/child exactly as-is — only the tag name and the added `initial`/`whileInView`/`viewport`/`variants` props change.)

- [ ] **Step 2: Add the same pattern to `SpecialistsSlider.tsx`**

Add the same imports. Add `const prefersReducedMotion = useReducedMotion();` inside the component. Wrap the header `<div className="flex flex-col gap-8 ...">` (lines 36-60) the same way as Services' header (as a `motion.div` with `fadeUpVariant`/`fadeUpVariantReduced`). Do NOT add stagger to the slider track itself (`<div className="slider-track" ...>`) — it already has its own `translateX` transform-based carousel animation from `useSpecialistsCarousel`; layering a second animation system on the same element risks fighting that hook's transform. Scroll-reveal only the header for this component.

- [ ] **Step 3: Verify**

`npm run build && npm run typecheck && npm run lint`. Manually load the homepage, scroll down slowly, confirm the Servicios section's heading and cards fade/slide in as they enter the viewport, and the Especialistas header does the same. Confirm nothing animates on every scroll pass (should be once-only, via `viewport={{ once: true }}`).

- [ ] **Step 4: Commit**

```bash
git add "app/(marketing)/components/Services.tsx" "app/(marketing)/components/SpecialistsSlider.tsx"
git commit -m "feat(motion): add scroll-reveal to Services and Specialists sections"
```

---

### Task 17: Scroll-reveal on BookingForm, FAQSection, ContactSection

**Files:**
- Modify: `app/(marketing)/components/BookingForm.tsx`
- Modify: `app/(marketing)/components/FAQSection.tsx`
- Modify: `app/(marketing)/components/ContactSection.tsx`

**Interfaces:**
- Consumes: same variants as Task 16.

- [ ] **Step 1: Read each file's current top-level section structure first**

These three files weren't read in full during this plan's research (unlike Services/SpecialistsSlider/Hero/ContactSection's footer, which were). Before editing, read each file's current JSX structure to identify: (a) the outermost `<section>`'s direct content wrapper (the element to apply `fadeUpVariant`/`whileInView` to — typically a header block plus a body block, following the exact same two-part pattern established in Task 16: header gets a simple `fadeUpVariant` reveal, any repeated list (FAQ items, contact channels) gets `staggerContainerVariant`/`staggerItemVariant`).

- [ ] **Step 2: Apply the established pattern to each**

For `BookingForm.tsx`: wrap the section's header/intro text block in `motion.div` + `fadeUpVariant`/`fadeUpVariantReduced` exactly as done for `Services.tsx` in Task 16. The form fields themselves should NOT be wrapped in scroll-reveal (form inputs animating in/out while a user is mid-fill is a bad UX pattern) — only the static intro copy above the form.

For `FAQSection.tsx`: wrap the header the same way. Wrap the FAQ items list container in `staggerContainerVariant`, each individual FAQ item (question+answer accordion row) in `staggerItemVariant`, following the exact structural approach from Task 16's Services grid.

For `ContactSection.tsx`: wrap the three-column grid's each column (`<div className="space-y-6">...</div>` for channels/socials, `<div className="rounded-3xl bg-white/15 ...">` for support, and the matching locations column) in individual `motion.div` + `fadeUpVariant`/`fadeUpVariantReduced` reveals — NOT staggered as a single group (they're three visually distinct cards side by side, not a repeated list, so three independent `whileInView` triggers reads better than one coordinated stagger). Use `const prefersReducedMotion = useReducedMotion();` and the `"use client"` directive (already present in this file, confirmed line 1).

- [ ] **Step 3: Verify**

`npm run build && npm run typecheck && npm run lint`. Manually scroll through Agenda, FAQ, and Contacto sections, confirm smooth once-only reveal animations, confirm the booking form's inputs are NOT animating (no distracting motion while filling the form).

- [ ] **Step 4: Commit**

```bash
git add "app/(marketing)/components/BookingForm.tsx" "app/(marketing)/components/FAQSection.tsx" "app/(marketing)/components/ContactSection.tsx"
git commit -m "feat(motion): add scroll-reveal to Agenda, FAQ, and Contacto sections"
```

---

### Task 18: Hero parallax and richer button/card hover motion

**Files:**
- Modify: `app/(marketing)/components/Hero.tsx`

**Interfaces:**
- Consumes: `motion`, `useReducedMotion`, `useScroll`, `useTransform` from `motion/react`.

- [ ] **Step 1: Convert `Hero.tsx` to a client component**

`Hero.tsx` currently has no `"use client"` directive (it's a server component, confirmed by reading the file — no hooks used). Add `"use client";` as the first line, since this task adds `useScroll`/`useTransform`/`useReducedMotion` hooks.

- [ ] **Step 2: Add a subtle parallax to the hero image card**

Add imports:

```ts
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
```

Inside the component, before `return`:

```ts
const prefersReducedMotion = useReducedMotion();
const heroRef = useRef<HTMLDivElement>(null);
const { scrollYProgress } = useScroll({
  target: heroRef,
  offset: ["start start", "end start"],
});
const parallaxY = useTransform(scrollYProgress, [0, 1], [0, prefersReducedMotion ? 0 : 40]);
```

Attach `ref={heroRef}` to the outermost `<section className="hero ...">` element.

Change the image card wrapper (currently `<div className="relative isolate mx-auto w-full max-w-[31rem] ...">`, line 78) to a `motion.div` with the parallax transform:

```tsx
<motion.div
  className="relative isolate mx-auto w-full max-w-[31rem] lg:max-h-[600px] lg:scale-95 xl:max-h-[640px] xl:scale-[0.98]"
  style={{ y: parallaxY }}
>
```

(Keep everything inside unchanged — the `<Image>`, the testimonial card, all untouched. Only the outer wrapper tag and its new `style` prop change.)

- [ ] **Step 3: Add an entrance fade to the hero text**

Wrap the text panel (`<div className="relative z-10 space-y-8" data-hero-text-panel>`, line 53) in a `motion.div` with a simple mount-time fade (not scroll-triggered, since it's above the fold and visible immediately on page load):

```tsx
<motion.div
  className="relative z-10 space-y-8"
  data-hero-text-panel
  initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, ease: "easeOut" }}
>
```

- [ ] **Step 4: Add hover-lift motion to primary/secondary CTA buttons**

Change the two CTA links (lines 59-64) from plain `<a>` to `motion.a`, adding a `whileHover`/`whileTap` scale (kept subtle, no color change per the design-system rule that hover never changes button color — only lift/scale):

```tsx
<motion.a
  href={primaryCta.href}
  className="btn-primary"
  whileHover={prefersReducedMotion ? undefined : { y: -2 }}
  whileTap={prefersReducedMotion ? undefined : { y: 0 }}
>
  {primaryCta.label}
</motion.a>
<motion.a
  href={secondaryCta.href}
  className="btn-secondary"
  whileHover={prefersReducedMotion ? undefined : { y: -2 }}
  whileTap={prefersReducedMotion ? undefined : { y: 0 }}
>
  {secondaryCta.label}
</motion.a>
```

Note: `.btn-primary`/`.btn-secondary` in `globals.css` likely already have a CSS `hover:-translate-y-0.5` or similar (per CLAUDE.md's documented button spec: "hover lift `-translate-y-0.5`") — check `app/globals.css` for the exact existing hover rule on these classes before adding the `whileHover` prop, to avoid double-applying the same lift via both CSS and motion (pick one — prefer keeping the existing CSS transition if it already does this, and skip the `whileHover`/`whileTap` addition entirely if so, to avoid a jittery double-animation. Only add the motion-based hover if the CSS class has NO existing hover transform).

- [ ] **Step 5: Verify**

`npm run build && npm run typecheck && npm run lint`. Manually load the homepage, confirm: the hero text fades in on load, the hero image card subtly shifts as you scroll past it (parallax), and CTA buttons don't visibly double-animate on hover. Test with OS-level "reduce motion" enabled (Windows: Settings → Accessibility → Visual effects → Animation effects, off) and confirm the parallax/fade become near-instant (no jarring motion) while everything remains functional.

- [ ] **Step 6: Commit**

```bash
git add "app/(marketing)/components/Hero.tsx"
git commit -m "feat(motion): add Hero parallax, entrance fade, and CTA hover motion"
```

---

### Task 19: Card hover micro-interactions on Services and Specialists cards

**Files:**
- Modify: `app/(marketing)/components/Services.tsx`
- Modify: `app/(marketing)/components/SpecialistsSlider.tsx`

**Interfaces:**
- Consumes: `motion`, `useReducedMotion` from `motion/react` (already imported in both files per Task 16).

- [ ] **Step 1: Check for existing CSS hover treatment first**

Both `.card` (used by `Services.tsx`'s service cards) and any existing hover class on `SpecialistsSlider.tsx`'s `.specialist` article should be checked in `app/globals.css` first — per CLAUDE.md, the "signature card" already has `hover:-translate-y-1 hover:shadow-2xl transition-all duration-300` baked into the `.card` utility class. Confirm this before adding a redundant `motion` hover — if `.card`'s existing CSS hover-lift is already smooth and sufficient, this task should skip Services entirely and only check whether `SpecialistsSlider.tsx`'s `.specialist` class has equivalent treatment (it may not, since it's a carousel slide, not a signature card).

- [ ] **Step 2: If `.specialist` lacks hover treatment, add a motion-based one**

If Step 1 confirms `.specialist` (the article wrapping each slide in `SpecialistsSlider.tsx`, line 70) has no existing hover lift, convert it to `motion.article` with a `whileHover`:

```tsx
<motion.article
  key={specialist.id}
  className="specialist flex flex-col"
  data-slide
  whileHover={prefersReducedMotion ? undefined : { y: -4 }}
  transition={{ duration: 0.2 }}
>
```

If `.card`/`.specialist` already have adequate CSS-driven hover treatment, this task's Step 2 is a no-op — report in your task report that the existing CSS was sufficient and no change was made (this is a legitimate, correct outcome, not a skipped task).

- [ ] **Step 3: Verify**

`npm run build && npm run typecheck && npm run lint`. Manually hover over service cards and specialist cards, confirm a smooth single lift effect (not double-animating from both CSS and motion).

- [ ] **Step 4: Commit**

```bash
git add "app/(marketing)/components/Services.tsx" "app/(marketing)/components/SpecialistsSlider.tsx"
git commit -m "feat(motion): add hover micro-interaction to specialist cards"
```

---

## Verification (whole plan)

```
npm run build && npm run typecheck && npm run lint && npm run test
```

Plus a full manual pass in the browser covering:
- Homepage: InfoBar/footer show the migrated social links and full navbar; Servicios grid still renders the 3 real services (unaffected by Task 5's ServiceModal cleanup); Especialistas slider "Reservar cita" links carry a real `professionalId`; scroll through the whole page and confirm every section's reveal animation fires once, smoothly, with no layout shift; footer shows "Desarrollado por DOGBYTE".
- `/portal/admin/content?section=services-copy` (now "Servicios"): list shows all real services, toggling "Mostrar en el sitio público" updates the homepage after reload, editing highlights/icon/order works.
- `/portal/admin/content?section=especialistas-copy` (now "Equipo"): same, for professionals.
- `/portal/admin/services`: `ServiceModal` no longer shows any homepage/marketing fields.
- `/portal/admin/users` → "Cambiar rol" on a PROFESIONAL: `RoleModal` no longer shows "Presencia en el sitio público".
- `/portal/admin/users` → "Ver ficha" on a PACIENTE: opens the large modal with real clinical history (episodios clínicos) visible.
- `/portal/admin/staff` and `/portal/admin/patients`: both redirect cleanly into `/portal/admin/users` with the right role pre-filtered.
- `/appointments/new?professionalId=<id>`: professional pre-selected in the dropdown.
- Test with OS "reduce motion" enabled: all animations degrade to instant/near-instant, nothing breaks functionally.
