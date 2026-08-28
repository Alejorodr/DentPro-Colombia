# Admin UX Redesign: Users/Roles/Specialties + Content CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the admin portal's two most confusing subsystems: (1) Users/Roles/Specialties management gets a discoverable nav, a single "Cambiar rol" modal replacing three disconnected inline controls, and a new "Servicios que ofrece" section that finally exposes the working-but-UI-less `ProfessionalService` API; (2) the Content CMS gets a sidebar+panel layout replacing the single 12-section scroll, plus a genuinely new Navbar content section (the only real data-layer gap found — InfoBar and Acciones flotantes already exist inside Settings, just undiscoverable).

**Architecture:** Sub-project 1 touches only `app/portal/admin/users/AdminUsersPanel.tsx` (split into a new `RoleModal.tsx`), `app/portal/components/PortalShell.tsx`, and `app/portal/admin/staff/page.tsx` — no schema changes, both APIs it needs (`/api/users/[id]`, `/api/specialties`, `/api/services`, `/api/admin/scheduling`) already exist and are unchanged. Sub-project 2 adds one new Prisma model (`HomepageNavLink`, mirroring the existing `HomepageSocialLink` pattern exactly) with its own CRUD+reorder API and admin panel, then wraps the existing 12+2 panel components in a new sidebar+single-panel shell that deep-links into Settings for the two already-existing-but-buried sections instead of duplicating them.

**Tech Stack:** Next.js 16 App Router, Prisma, Tailwind v4, existing `Card`/`StatusBadge`/`STATUS_COLORS` tokens, Zod validation, `fetchWithRetry`/`fetchWithTimeout` from `lib/http`.

## Global Constraints

- Locked blue-only palette (`brand-teal`, `brand-indigo`, `brand-sky`, `accent-cyan`, `brand-light`) — no new colors, no new tokens. Reuse `Card.tsx`, `STATUS_COLORS`, existing modal chrome (`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4` / `bg-black/40 p-4`, `rounded-2xl ... shadow-xl`).
- Icons only via `@/components/ui/Icon.tsx` barrel, never a direct `@phosphor-icons/react` import.
- Español tú-form, sentence case, no exclamation marks except one success message per page, CTAs are verbs.
- Portal nav labels in English is NOT the rule here — existing admin sidebar labels are Spanish ("Gestión de personal", "Contenido", etc.) — match that, not the CLAUDE.md English-nav guidance which applies elsewhere.
- Every new interactive element ships all 8 states: default, hover, focus-visible, active, disabled, loading, error, success.
- Confirm before destructive/significant actions (role change, specialty reassignment) — the existing delete-user/delete-specialty flows use `window.confirm`, which is the established pattern in this codebase for destructive confirms; do not introduce a new confirm-modal component for actions that already use it.
- No horizontal scroll; verified at 375px, 768px, 1280px, both light and dark mode.
- Repo lives under OneDrive — if `npm run build` hits `EPERM` or a Turbopack worker crash, delete `.next` and rebuild once before treating it as a real failure.
- Verification gate for every task: `npm run build && npm run typecheck && npm run lint && npm run test` (delete `.next` first if the OneDrive flakiness above applies).
- Never dispatch multiple implementer subagents in parallel — tasks below are sequential because later tasks edit files earlier tasks create.

---

## Sub-project 1: Users / Roles / Specialties

### Task 1: Navigation fix — surface Usuarios and Especialidades, disclose the staff filter

**Files:**
- Modify: `app/portal/components/PortalShell.tsx:61-70` (the `ADMINISTRADOR` nav array)
- Modify: `app/portal/admin/staff/page.tsx` (full file, 19 lines)

**Interfaces:**
- Consumes: nothing new.
- Produces: two new reachable routes (`/portal/admin/users`, `/portal/admin/specialties`) via sidebar nav; no component API changes.

- [ ] **Step 1: Add "Usuarios" and "Especialidades" to the admin nav array**

In `app/portal/components/PortalShell.tsx`, the `ADMINISTRADOR` array currently reads:

```tsx
  ADMINISTRADOR: [
    { label: "Inicio", href: "/portal/admin", icon: House },
    { label: "Gestión de personal", href: "/portal/admin/staff", icon: Users },
    { label: "Registro de pacientes", href: "/portal/admin/patients", icon: Users },
    { label: "Servicios y tarifas", href: "/portal/admin/services", icon: ClipboardText },
    { label: "Gestión de agenda", href: "/portal/admin/scheduling", icon: CalendarCheck },
    { label: "Contenido", href: "/portal/admin/content", icon: SquaresFour },
    { label: "Plantillas clínicas", href: "/portal/admin/templates", icon: ClipboardText },
    { label: "Auditoría", href: "/portal/admin/audit", icon: ShieldCheck },
  ],
```

Change it to insert "Usuarios" right after "Inicio" (it's the master list everything else derives from) and "Especialidades" right after "Gestión de personal" (where an admin would look for it after seeing the staff-only view):

```tsx
  ADMINISTRADOR: [
    { label: "Inicio", href: "/portal/admin", icon: House },
    { label: "Usuarios", href: "/portal/admin/users", icon: Users },
    { label: "Gestión de personal", href: "/portal/admin/staff", icon: Users },
    { label: "Especialidades", href: "/portal/admin/specialties", icon: ClipboardText },
    { label: "Registro de pacientes", href: "/portal/admin/patients", icon: Users },
    { label: "Servicios y tarifas", href: "/portal/admin/services", icon: ClipboardText },
    { label: "Gestión de agenda", href: "/portal/admin/scheduling", icon: CalendarCheck },
    { label: "Contenido", href: "/portal/admin/content", icon: SquaresFour },
    { label: "Plantillas clínicas", href: "/portal/admin/templates", icon: ClipboardText },
    { label: "Auditoría", href: "/portal/admin/audit", icon: ShieldCheck },
  ],
```

`Users`, `ClipboardText`, `CalendarCheck`, `House`, `SquaresFour`, `ShieldCheck` are already imported at the top of this file for the other role arrays — no new imports needed.

- [ ] **Step 2: Disclose the staff-page filter and cross-link to the full list**

Read the current `app/portal/admin/staff/page.tsx` (19 lines) — it renders `<AdminProfessionalsPanel />` under a "Staff Management"/"Equipo clínico" header with no mention that this is a filtered view. Add a subtitle and a link to `/portal/admin/users`. Follow the exact header pattern already used in `app/portal/admin/content/page.tsx:36-48` (eyebrow `<p>` + `<h1>` + description `<p>`), and add a `Link` to the full list styled like the existing "Ver todos" style link pattern used elsewhere in the admin portal (a plain `<Link>` with `text-sm font-semibold text-brand-teal hover:underline dark:text-accent-cyan`). Import `Link` from `"next/link"`. The exact final JSX depends on the current file's header markup — preserve the existing `<AdminProfessionalsPanel />` render untouched, only add the subtitle line and the link above it, e.g.:

```tsx
<p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
  Mostrando solo profesionales.{" "}
  <Link href="/portal/admin/users" className="font-semibold text-brand-teal hover:underline dark:text-accent-cyan">
    Ver todos los usuarios
  </Link>
</p>
```

- [ ] **Step 3: Verify**

Run `npm run build && npm run typecheck && npm run lint`. Manually confirm (dev server, admin session) that "Usuarios" and "Especialidades" appear in the sidebar and both routes load without error, and that `/portal/admin/staff` now shows the disclosure line with a working link to `/portal/admin/users`.

- [ ] **Step 4: Commit**

```bash
git add app/portal/components/PortalShell.tsx app/portal/admin/staff/page.tsx
git commit -m "feat(admin): surface Usuarios and Especialidades in admin nav, disclose staff filter"
```

---

### Task 2: RoleModal — Rol + Especialidad sections, replacing the inline draft mechanism

**Files:**
- Create: `app/portal/admin/users/RoleModal.tsx`
- Modify: `app/portal/admin/users/AdminUsersPanel.tsx`

**Interfaces:**
- Consumes: `UserRecord`, `UserRole`, `roleLabels`, `userRoles` from `@/lib/auth/roles`; `STATUS_COLORS` from `@/app/portal/components/ui/statusColors`; `fetchWithTimeout` from `@/lib/http`.
- Produces: `RoleModal` component with props `{ user: UserRecord; specialties: Specialty[]; roleLock?: UserRole; onClose: () => void; onSaved: () => void; onSpecialtyCreated: (specialty: Specialty) => void }`. A widened `Specialty` type `{ id: string; name: string; defaultSlotDurationMinutes: number; active: boolean }` (the current file only has `{id, name}` — GET /api/specialties already returns the full shape, this was just under-typed). Later tasks (3, 4) add sections to this same file.

**Why role+especialidad share one save action, not two independent ones:** `PATCH /api/users/[id]` requires `role` and `specialtyId` in the *same* request when transitioning a user to `PROFESIONAL` (server-side guard: "La especialidad es obligatoria para profesionales." if `specialtyId` is missing and no existing professional profile exists — see `app/api/users/[id]/route.ts:173-200`). Splitting Rol and Especialidad into two separate PATCH calls would either violate that guard or require a fragile two-step client-side dance. One combined "Guardar rol" action for sections 1+2 is the correct mapping of this spec's 3-section modal onto the real API contract — the reviewer should not flag this as a scope deviation.

- [ ] **Step 1: Create `RoleModal.tsx` with the Rol + Especialidad sections**

```tsx
"use client";

import { useState } from "react";

import { roleLabels, userRoles, type UserRole } from "@/lib/auth/roles";
import { fetchWithTimeout } from "@/lib/http";
import { STATUS_COLORS } from "@/app/portal/components/ui/statusColors";

export type Specialty = {
  id: string;
  name: string;
  defaultSlotDurationMinutes: number;
  active: boolean;
};

export type RoleModalUser = {
  id: string;
  email: string;
  name: string;
  lastName: string;
  role: UserRole;
  professional?: { id: string; specialty?: { id: string; name: string } | null } | null;
};

type SaveStatus = "idle" | "loading" | "done" | "error";

export function RoleModal({
  user,
  specialties,
  roleLock,
  onClose,
  onSaved,
  onSpecialtyCreated,
}: {
  user: RoleModalUser;
  specialties: Specialty[];
  roleLock?: UserRole;
  onClose: () => void;
  onSaved: () => void;
  onSpecialtyCreated: (specialty: Specialty) => void;
}) {
  const [role, setRole] = useState<UserRole>(roleLock ?? user.role);
  const [specialtyId, setSpecialtyId] = useState(user.professional?.specialty?.id ?? "");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [showCreateSpecialty, setShowCreateSpecialty] = useState(false);
  const [newSpecialtyName, setNewSpecialtyName] = useState("");
  const [newSpecialtyDuration, setNewSpecialtyDuration] = useState("");
  const [creatingSpecialty, setCreatingSpecialty] = useState(false);
  const [createSpecialtyError, setCreateSpecialtyError] = useState<string | null>(null);

  const requiresSpecialty = role === "PROFESIONAL";
  const canSave = !requiresSpecialty || specialtyId.length > 0;

  const handleSave = async () => {
    if (!canSave) {
      setErrorMsg("Selecciona una especialidad para el profesional.");
      return;
    }

    setStatus("loading");
    setErrorMsg(null);

    const response = await fetchWithTimeout(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        specialtyId: role === "PROFESIONAL" ? specialtyId : undefined,
      }),
    });

    if (response.ok) {
      setStatus("done");
      onSaved();
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setErrorMsg(body?.error ?? "No pudimos guardar el rol.");
      setStatus("error");
    }
  };

  const handleCreateSpecialty = async () => {
    if (!newSpecialtyName.trim() || !newSpecialtyDuration.trim()) {
      setCreateSpecialtyError("Nombre y duración son obligatorios.");
      return;
    }

    setCreatingSpecialty(true);
    setCreateSpecialtyError(null);

    const response = await fetchWithTimeout("/api/specialties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newSpecialtyName.trim(),
        defaultSlotDurationMinutes: Number(newSpecialtyDuration),
      }),
    });

    if (response.ok) {
      const created = (await response.json()) as Specialty;
      onSpecialtyCreated(created);
      setSpecialtyId(created.id);
      setShowCreateSpecialty(false);
      setNewSpecialtyName("");
      setNewSpecialtyDuration("");
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setCreateSpecialtyError(body?.error ?? "No pudimos crear la especialidad.");
    }

    setCreatingSpecialty(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-elevated">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Usuarios</p>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Cambiar rol · {user.name} {user.lastName}
            </h3>
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

        <div className="mt-5 space-y-4">
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Rol</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_COLORS.Active.badge}`}
              >
                Actual: {roleLabels[user.role]}
              </span>
            </div>
            {roleLock ? (
              <div className="input mt-2 flex h-11 items-center text-sm text-slate-600 dark:text-slate-300">
                {roleLabels[roleLock]}
              </div>
            ) : (
              <select
                className="input mt-2 h-11 text-sm"
                value={role}
                onChange={(event) => {
                  setRole(event.target.value as UserRole);
                  setStatus("idle");
                }}
                disabled={status === "loading"}
              >
                {userRoles.map((r) => (
                  <option key={r} value={r}>
                    {roleLabels[r]}
                  </option>
                ))}
              </select>
            )}
          </section>

          {role === "PROFESIONAL" ? (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Especialidad
              </p>
              <select
                className="input mt-2 h-11 text-sm"
                value={specialtyId}
                onChange={(event) => setSpecialtyId(event.target.value)}
                disabled={status === "loading"}
              >
                <option value="">Selecciona una especialidad</option>
                {specialties.map((specialty) => (
                  <option key={specialty.id} value={specialty.id}>
                    {specialty.name}
                  </option>
                ))}
              </select>

              {showCreateSpecialty ? (
                <div className="mt-3 space-y-2 rounded-xl border border-slate-200 p-3 dark:border-surface-muted">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      className="input h-10 text-sm"
                      placeholder="Nombre"
                      value={newSpecialtyName}
                      onChange={(event) => setNewSpecialtyName(event.target.value)}
                      disabled={creatingSpecialty}
                    />
                    <input
                      className="input h-10 text-sm"
                      placeholder="Duración base (min)"
                      value={newSpecialtyDuration}
                      onChange={(event) => setNewSpecialtyDuration(event.target.value)}
                      disabled={creatingSpecialty}
                    />
                  </div>
                  {createSpecialtyError ? (
                    <p className="text-xs text-red-600 dark:text-red-400">{createSpecialtyError}</p>
                  ) : null}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-full bg-brand-teal px-3 py-1.5 text-xs font-semibold uppercase text-white disabled:opacity-60"
                      onClick={() => void handleCreateSpecialty()}
                      disabled={creatingSpecialty}
                    >
                      {creatingSpecialty ? "Creando..." : "Crear"}
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase text-slate-600 dark:border-surface-muted dark:text-slate-200"
                      onClick={() => setShowCreateSpecialty(false)}
                      disabled={creatingSpecialty}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold text-brand-teal hover:underline dark:text-accent-cyan"
                  onClick={() => setShowCreateSpecialty(true)}
                >
                  + Crear especialidad
                </button>
              )}
            </section>
          ) : null}

          {errorMsg ? <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p> : null}
          {status === "done" ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Rol actualizado correctamente.</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase text-slate-600 dark:border-surface-muted dark:text-slate-200"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!canSave || status === "loading"}
              className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-50"
            >
              {status === "loading" ? "Guardando..." : "Guardar rol"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

Note: Task 4 will add a third "Servicios que ofrece" section to this same file, gated on `user.professional?.id` existing (i.e. only after this Rol+Especialidad save has round-tripped through the parent's reload). Do not build that section in this task.

- [ ] **Step 2: Wire `RoleModal` into `AdminUsersPanel.tsx`, removing the old inline draft mechanism**

In `app/portal/admin/users/AdminUsersPanel.tsx`:

1. Remove the local `Specialty` type (`{id, name}` at lines 10-13) and import `Specialty` from `./RoleModal` instead. Remove the `UserDraft` type (lines 28-31) and the `drafts` state (line 155), `updateDraft` (lines 264-266), and `applyDraft` (lines 268-305) functions entirely — the modal now owns this.
2. Add `import { RoleModal, type RoleModalUser } from "./RoleModal";` and state: `const [roleModalUserId, setRoleModalUserId] = useState<string | null>(null);`
3. Derive the modal's user fresh from state on every render, right before the `return`: `const roleModalUser = users.find((u) => u.id === roleModalUserId) ?? null;`
4. In the per-row action buttons (currently lines 553-627), replace the inline role `<select>` + specialty `<select>` + "Guardar rol" button (lines 554-598) with a single button:

```tsx
<button
  type="button"
  className="rounded-full border border-brand-teal px-3 py-1 text-xs font-semibold uppercase text-brand-teal"
  onClick={() => setRoleModalUserId(user.id)}
  disabled={saving}
>
  Cambiar rol
</button>
```

5. At the end of the component, alongside the existing `{resetModal ? ... : null}` block, add:

```tsx
{roleModalUser ? (
  <RoleModal
    user={roleModalUser}
    specialties={specialties}
    roleLock={roleLock}
    onClose={() => setRoleModalUserId(null)}
    onSaved={() => void loadData()}
    onSpecialtyCreated={(specialty) => setSpecialties((prev) => [...prev, specialty])}
  />
) : null}
```

6. The `specialties` state's type annotation now comes from the imported `Specialty` type (with `defaultSlotDurationMinutes`/`active`) — the existing `loadData()` call already fetches the full objects from `GET /api/specialties`, no fetch logic changes needed, only the type.
7. Leave the "Crear usuario" form's own inline specialty `<select>` (lines 401-415) untouched — that's a different, still-needed flow (assigning specialty at creation time), out of scope per the spec's "no changes to row-level actions... beyond the role/specialty/service consolidation".

- [ ] **Step 3: Verify**

Run `npm run build && npm run typecheck && npm run lint`. Manually test: click "Cambiar rol" on a Cliente row, switch to Profesional, confirm the Especialidad section appears and blocks save until one is chosen, save, confirm the modal shows the success message and the row's "Rol actual" line updates after the modal's `onSaved` triggers `loadData()`. Test "+ Crear especialidad" creates a specialty and auto-selects it.

- [ ] **Step 4: Commit**

```bash
git add app/portal/admin/users/RoleModal.tsx app/portal/admin/users/AdminUsersPanel.tsx
git commit -m "feat(admin): replace inline role/specialty controls with Cambiar rol modal"
```

---

### Task 3: RoleModal — "Servicios que ofrece" section

**Files:**
- Modify: `app/portal/admin/users/RoleModal.tsx`

**Interfaces:**
- Consumes: `GET /api/services` (returns `{data: Service[], total, page, pageSize}`, each `Service` has `id, name, priceCents, durationMinutes, active, specialtyId`); `GET /api/admin/scheduling?professionalId=X` (returns `{assignments: ProfessionalServiceAssignment[], ...}`, each assignment has `id, professionalId, serviceId, active, onlineBookable, service: {id, name, active}`); `POST /api/admin/scheduling` with `{type: "createAssignment", professionalId, serviceId, onlineBookable}` or `{type: "updateAssignment", assignmentId, active, onlineBookable}`.
- Produces: nothing new consumed by later tasks — this is the last section of the modal.

This section only renders when `user.professional?.id` exists — i.e. after the Rol+Especialidad save in Task 2 has round-tripped (the parent's `loadData()` refetch populates `professional.id` from `GET /api/users`, which includes it; the flat `PATCH /api/users/[id]` response does not, which is why `onSaved` triggers a full parent reload rather than a local patch).

- [ ] **Step 1: Add the services + assignments state and fetch logic**

In `RoleModal.tsx`, add types and state:

```tsx
type Service = {
  id: string;
  name: string;
  priceCents: number;
  durationMinutes: number | null;
  active: boolean;
  specialtyId: string | null;
};

type Assignment = {
  id: string;
  serviceId: string;
  active: boolean;
  onlineBookable: boolean;
};
```

Inside the `RoleModal` function, add:

```tsx
  const [services, setServices] = useState<Service[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [assignmentSaving, setAssignmentSaving] = useState<string | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  const professionalId = user.professional?.id;

  useEffect(() => {
    if (!professionalId || role !== "PROFESIONAL") return;

    let cancelled = false;
    setServicesLoading(true);

    void (async () => {
      const [servicesResponse, assignmentsResponse] = await Promise.all([
        fetchWithTimeout("/api/services?pageSize=100"),
        fetchWithTimeout(`/api/admin/scheduling?professionalId=${professionalId}`),
      ]);

      if (cancelled) return;

      if (servicesResponse.ok) {
        const body = (await servicesResponse.json()) as { data: Service[] };
        setServices(body.data ?? []);
      }
      if (assignmentsResponse.ok) {
        const body = (await assignmentsResponse.json()) as { assignments: Assignment[] };
        setAssignments(body.assignments ?? []);
      }
      setServicesLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [professionalId, role]);
```

Add `useEffect` to the imports at the top: `import { useEffect, useState } from "react";`

- [ ] **Step 2: Add the toggle handler and render the section**

```tsx
  const toggleServiceAssignment = async (service: Service, field: "active" | "onlineBookable") => {
    if (!professionalId) return;

    const existing = assignments.find((a) => a.serviceId === service.id);
    setAssignmentSaving(service.id);
    setAssignmentError(null);

    const response = existing
      ? await fetchWithTimeout("/api/admin/scheduling", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "updateAssignment",
            assignmentId: existing.id,
            active: field === "active" ? !existing.active : existing.active,
            onlineBookable: field === "onlineBookable" ? !existing.onlineBookable : existing.onlineBookable,
          }),
        })
      : await fetchWithTimeout("/api/admin/scheduling", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "createAssignment",
            professionalId,
            serviceId: service.id,
            onlineBookable: field === "onlineBookable",
          }),
        });

    if (response.ok) {
      const body = (await response.json()) as { assignment: Assignment };
      setAssignments((prev) => {
        const withoutCurrent = prev.filter((a) => a.serviceId !== service.id);
        return [...withoutCurrent, body.assignment];
      });
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setAssignmentError(body?.error ?? "No pudimos actualizar el servicio.");
    }

    setAssignmentSaving(null);
  };
```

Render, right after the Especialidad `<section>` block (still inside the `role === "PROFESIONAL"` branch, but only once a specialty is selected — matches the spec's "appears once a specialty is selected"):

```tsx
          {role === "PROFESIONAL" && professionalId && specialtyId ? (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Servicios que ofrece
              </p>
              {servicesLoading ? (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Cargando servicios...</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {services
                    .filter((service) => service.specialtyId === specialtyId)
                    .map((service) => {
                      const assignment = assignments.find((a) => a.serviceId === service.id);
                      const isActive = assignment?.active ?? false;
                      const isBookable = assignment?.onlineBookable ?? false;
                      const isSaving = assignmentSaving === service.id;
                      return (
                        <div
                          key={service.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-sm dark:border-surface-muted"
                        >
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{service.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(service.priceCents / 100)}
                              {service.durationMinutes ? ` · ${service.durationMinutes} min` : ""}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => void toggleServiceAssignment(service, "active")}
                              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${
                                isActive
                                  ? STATUS_COLORS.Active.border + " " + STATUS_COLORS.Active.text
                                  : STATUS_COLORS.Inactive.border + " " + STATUS_COLORS.Inactive.text
                              }`}
                            >
                              {isActive ? "Activo" : "Inactivo"}
                            </button>
                            <button
                              type="button"
                              disabled={isSaving || !isActive}
                              onClick={() => void toggleServiceAssignment(service, "onlineBookable")}
                              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase disabled:opacity-40 ${
                                isBookable
                                  ? "border-brand-teal text-brand-teal"
                                  : "border-slate-200 text-slate-500 dark:border-surface-muted dark:text-slate-400"
                              }`}
                            >
                              {isBookable ? "Reservable online" : "No reservable online"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  {services.filter((service) => service.specialtyId === specialtyId).length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No hay servicios cargados para esta especialidad todavía.
                    </p>
                  ) : null}
                </div>
              )}
              {assignmentError ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{assignmentError}</p> : null}
            </section>
          ) : null}
```

Place this block after the existing Especialidad `<section>` and before the `{errorMsg ? ...}` line.

- [ ] **Step 3: Verify**

Run `npm run build && npm run typecheck && npm run lint`. Manually test on an existing Profesional user: open "Cambiar rol", confirm "Servicios que ofrece" lists that specialty's services, toggle Activo/Reservable online on one, close and reopen the modal, confirm the toggle state persisted (round-trip through `GET /api/admin/scheduling`).

- [ ] **Step 4: Commit**

```bash
git add app/portal/admin/users/RoleModal.tsx
git commit -m "feat(admin): add Servicios que ofrece section to Cambiar rol modal"
```

---

### Task 4: Sub-project 1 whole-flow review pass

**Files:** none (review-only task; fix anything the review turns up in the same files as Tasks 1-3).

**Interfaces:** none.

- [ ] **Step 1: Manual pass at 375px, 768px, 1280px, both themes**

Using the dev server and an admin session, exercise: nav discoverability (Task 1), all 4 role transitions through the modal (Cliente→Profesional requires especialidad; Profesional→Cliente/Recepcionista/Administrador deletes the ProfessionalProfile per the existing API contract — confirm the row reflects it after `onSaved`), inline especialidad creation, and service toggles. Confirm no horizontal scroll and no content jumping at any breakpoint, and that the modal's focus-visible states are visible on tab-through.

- [ ] **Step 2: Run full verification gate**

```bash
npm run build && npm run typecheck && npm run lint && npm run test
```

- [ ] **Step 3: Fix any findings inline, then commit**

If the manual pass or gate surfaces issues, fix them in the relevant file from Tasks 1-3 and commit with a `fix(admin):` message. If clean, no commit needed for this task.

---

## Sub-project 2: Content CMS (Navbar + sidebar restructure)

### Task 5: Prisma model for Navbar links

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Consumes: nothing.
- Produces: `HomepageNavLink` model — `{id: String @id @default(uuid()), label: String, href: String, sortOrder: Int @default(0), isActive: Boolean @default(true), createdAt: DateTime, updatedAt: DateTime}`, indexed `[isActive, sortOrder]`. Later tasks (6, 7, 8) depend on this exact shape and name.

- [ ] **Step 1: Add the model**

In `prisma/schema.prisma`, add this new model immediately after the closing brace of `model HomepageSocialLink` (currently ending at line 908), mirroring it exactly minus the icon field (nav links don't carry an icon):

```prisma
model HomepageNavLink {
  id        String   @id @default(uuid())
  label     String
  href      String
  sortOrder Int      @default(0)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([isActive, sortOrder])
}
```

- [ ] **Step 2: Generate and apply the migration**

```bash
npx prisma migrate dev --name add_homepage_nav_link
```

Expected: a new migration folder is created under `prisma/migrations/`, and `npx prisma generate` runs automatically as part of `migrate dev`, updating the Prisma Client types to include `prisma.homepageNavLink`.

- [ ] **Step 3: Verify**

Run `npx prisma validate` and `npm run typecheck` (the generated client must expose `homepageNavLink` before later tasks compile). If OneDrive causes an `EPERM` on the generated client, delete `node_modules/.prisma` and re-run `npx prisma generate`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add HomepageNavLink model for admin-editable navbar links"
```

---

### Task 6: Admin API for nav links — CRUD + reorder

**Files:**
- Create: `app/api/admin/homepage/nav-links/route.ts`
- Create: `app/api/admin/homepage/nav-links/[linkId]/route.ts`
- Create: `app/api/admin/homepage/nav-links/reorder/route.ts`

**Interfaces:**
- Consumes: `requireAdmin`, `requiredText`, `requiredHref` from `../_lib` (`app/api/admin/homepage/_lib.ts` — `requiredHref` already supports `#anchor` hrefs, which is what nav links use, unlike `requiredAbsoluteHttpUrl` used by social links); `getPrismaClient` from `@/lib/prisma`; `logAuditEvent` from `@/lib/audit`; `parseJson` from `@/app/api/_utils/validation`; `errorResponse` from `@/app/api/_utils/response`.
- Produces: `GET /api/admin/homepage/nav-links` → `{navLinks: NavLinkPayload[]}`; `POST` → `{navLink: NavLinkPayload}` (201); `PATCH /api/admin/homepage/nav-links/[linkId]` → `{navLink: NavLinkPayload}`; `DELETE` → `{ok: true}`; `PATCH /api/admin/homepage/nav-links/reorder` with `{orderedIds: string[]}` → `{ok: true}`. `NavLinkPayload = {id, label, href, sortOrder, isActive}`. This exact shape is what Task 9's `AdminHomepageNavLinksPanel.tsx` consumes.

This mirrors `app/api/admin/homepage/social-links/{route.ts,[linkId]/route.ts,reorder/route.ts}` exactly, swapping the model name and dropping the `iconKey` field (nav links have none) and swapping the URL validator (`requiredHref` instead of `requiredAbsoluteHttpUrl`, since `#servicios`-style anchors must remain valid).

- [ ] **Step 1: Create `app/api/admin/homepage/nav-links/route.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJson } from "@/app/api/_utils/validation";
import { logAuditEvent } from "@/lib/audit";
import { getPrismaClient } from "@/lib/prisma";

import { requireAdmin, requiredHref, requiredText } from "../_lib";

const navLinkCreateSchema = z.object({
  href: requiredHref(500),
  label: requiredText(1, 120),
  isActive: z.boolean().optional(),
});

type NavLinkRecord = {
  id: string;
  href: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
};

function serializeNavLink(link: NavLinkRecord) {
  return {
    id: link.id,
    href: link.href,
    label: link.label,
    sortOrder: link.sortOrder,
    isActive: link.isActive,
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const prisma = getPrismaClient();
  const navLinks = await prisma.homepageNavLink.findMany({ orderBy: { sortOrder: "asc" } });

  return NextResponse.json({ navLinks: navLinks.map(serializeNavLink) });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data: body, error } = await parseJson(request, navLinkCreateSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const maxSort = await prisma.homepageNavLink.aggregate({ _max: { sortOrder: true } });

  const navLink = await prisma.homepageNavLink.create({
    data: {
      href: body.href,
      label: body.label,
      isActive: body.isActive ?? true,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  await logAuditEvent({
    actor: { userId: auth.sessionUser.id, role: auth.sessionUser.role },
    action: "homepage.nav-links.created",
    resourceType: "homepage_nav_link",
    resourceId: navLink.id,
    targetLabel: navLink.label,
    status: "success",
    metadata: { href: navLink.href, isActive: navLink.isActive },
  });

  return NextResponse.json({ navLink: serializeNavLink(navLink) }, { status: 201 });
}
```

- [ ] **Step 2: Create `app/api/admin/homepage/nav-links/[linkId]/route.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { logAuditEvent } from "@/lib/audit";
import { getPrismaClient } from "@/lib/prisma";

import { requireAdmin, requiredHref, requiredText } from "../../_lib";

const navLinkUpdateSchema = z
  .object({
    href: requiredHref(500).optional(),
    label: requiredText(1, 120).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, "Debes enviar al menos un campo para actualizar.");

type NavLinkRecord = {
  id: string;
  href: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
};

function serializeNavLink(link: NavLinkRecord) {
  return {
    id: link.id,
    href: link.href,
    label: link.label,
    sortOrder: link.sortOrder,
    isActive: link.isActive,
  };
}

export async function PATCH(request: Request, context: { params: Promise<{ linkId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { linkId } = await context.params;
  const { data: body, error } = await parseJson(request, navLinkUpdateSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const existing = await prisma.homepageNavLink.findUnique({ where: { id: linkId } });
  if (!existing) {
    return errorResponse("Enlace de navegación no encontrado.", 404);
  }

  const updated = await prisma.homepageNavLink.update({
    where: { id: linkId },
    data: body,
  });

  await logAuditEvent({
    actor: { userId: auth.sessionUser.id, role: auth.sessionUser.role },
    action: "homepage.nav-links.updated",
    resourceType: "homepage_nav_link",
    resourceId: updated.id,
    targetLabel: updated.label,
    status: "success",
    metadata: { changedFields: Object.keys(body) },
  });

  return NextResponse.json({ navLink: serializeNavLink(updated) });
}

export async function DELETE(_request: Request, context: { params: Promise<{ linkId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { linkId } = await context.params;
  const prisma = getPrismaClient();

  const existing = await prisma.homepageNavLink.findUnique({ where: { id: linkId } });
  if (!existing) {
    return errorResponse("Enlace de navegación no encontrado.", 404);
  }

  await prisma.homepageNavLink.delete({ where: { id: linkId } });

  const remaining = await prisma.homepageNavLink.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });

  await prisma.$transaction(
    remaining.map((item: { id: string }, index: number) =>
      prisma.homepageNavLink.update({
        where: { id: item.id },
        data: { sortOrder: index },
      }),
    ),
  );

  await logAuditEvent({
    actor: { userId: auth.sessionUser.id, role: auth.sessionUser.role },
    action: "homepage.nav-links.deleted",
    resourceType: "homepage_nav_link",
    resourceId: existing.id,
    targetLabel: existing.label,
    status: "success",
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Create `app/api/admin/homepage/nav-links/reorder/route.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { logAuditEvent } from "@/lib/audit";
import { getPrismaClient } from "@/lib/prisma";

import { requireAdmin } from "../../_lib";

const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data: body, error } = await parseJson(request, reorderSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const links = await prisma.homepageNavLink.findMany({ select: { id: true } });

  if (links.length !== body.orderedIds.length) {
    return errorResponse("La lista de orden no coincide con la cantidad de enlaces de navegación.", 400);
  }

  if (new Set(body.orderedIds).size !== body.orderedIds.length) {
    return errorResponse("La lista de orden contiene enlaces de navegación duplicados.", 400);
  }

  const expected = new Set(links.map((item: { id: string }) => item.id));
  const received = new Set(body.orderedIds);
  if (received.size !== expected.size || [...received].some((id) => !expected.has(id))) {
    return errorResponse("La lista de orden contiene enlaces de navegación inválidos.", 400);
  }

  await prisma.$transaction(
    body.orderedIds.map((id, index) =>
      prisma.homepageNavLink.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  await logAuditEvent({
    actor: { userId: auth.sessionUser.id, role: auth.sessionUser.role },
    action: "homepage.nav-links.reordered",
    resourceType: "homepage_nav_link",
    status: "success",
    metadata: { itemCount: body.orderedIds.length, order: body.orderedIds },
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Verify**

Run `npm run build && npm run typecheck && npm run lint`. Manually hit the endpoints (`curl` or the browser dev console while logged in as admin) to confirm GET returns `{navLinks: []}` on an empty table.

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/homepage/nav-links
git commit -m "feat(api): add admin CRUD + reorder endpoints for homepage nav links"
```

---

### Task 7: Wire navLinks into the homepage content pipeline

**Files:**
- Modify: `lib/marketing/homepage-types.ts`
- Modify: `lib/marketing/homepage-defaults.ts`
- Modify: `lib/marketing/homepage.ts`

**Interfaces:**
- Consumes: `prisma.homepageNavLink` (Task 5).
- Produces: `HomepageNavLinkContent = {label: string; href: string}`; `HomepageNormalizedContent.navLinks: HomepageNavLinkContent[]`. Task 8 (`app/page.tsx`) and Task 9 (admin panel) both depend on this field existing with this exact name and shape.

- [ ] **Step 1: Add the type**

In `lib/marketing/homepage-types.ts`, add after `HomepageLegalLinkContent` (currently lines 77-80):

```ts
export type HomepageNavLinkContent = {
  label: string;
  href: string;
};
```

Then add `navLinks: HomepageNavLinkContent[];` as a new top-level field on `HomepageNormalizedContent`, right before `hero:` (currently line 100):

```ts
  navLinks: HomepageNavLinkContent[];
  hero: {
```

- [ ] **Step 2: Add defaults**

In `lib/marketing/homepage-defaults.ts`, add `navLinks` to `HOMEPAGE_DEFAULT_CONTENT`, right before the `hero:` key (currently line 29), using the exact 5 links currently hardcoded as `NAV_LINKS` in `app/page.tsx:37-43` — this becomes the seed data so the visible navbar does not change when this ships:

```ts
  navLinks: [
    { href: "#servicios", label: "Servicios" },
    { href: "#especialistas", label: "Especialistas" },
    { href: "#agenda", label: "Agenda" },
    { href: "#preguntas-frecuentes", label: "FAQ" },
    { href: "#contacto", label: "Contacto" },
  ],
```

- [ ] **Step 3: Fetch and normalize in `getHomepageContent`**

In `lib/marketing/homepage.ts`, add `prisma.homepageNavLink.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } })` to the `prisma.$transaction([...])` array (currently lines 26-58) — add it as a new destructured variable `navLinks` and a new array element, e.g. right after `faqs`:

```ts
  const [
    settings,
    services,
    specialists,
    heroStats,
    bookingOptions,
    bookingBenefits,
    socials,
    supportItems,
    locations,
    legalLinks,
    faqs,
    navLinks,
  ] = await prisma.$transaction([
    prisma.homepageSettings.findUnique({ where: { id: HOMEPAGE_SETTINGS_SINGLETON_ID } }),
    prisma.homepageService.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        highlights: {
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    prisma.homepageSpecialist.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.homepageHeroStat.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.homepageBookingOption.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.homepageBookingBenefit.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.homepageSocialLink.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.homepageContactSupportItem.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.homepageLocation.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.homepageLegalLink.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.homepageFaq.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.homepageNavLink.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);
```

Then add `navLinks` to the returned object, right before `hero:` (currently line 104):

```ts
    navLinks:
      navLinks.length > 0
        ? navLinks.map((link) => ({ href: link.href, label: link.label }))
        : fallback.navLinks,
    hero: {
```

- [ ] **Step 4: Seed on bootstrap**

In `bootstrapHomepageContent` (same file), add a seeding block mirroring the existing `homepageSocialLink` one (currently lines 389-399), placed anywhere among the sibling `if ((await prisma.homepageX.count()) === 0)` blocks:

```ts
  if ((await prisma.homepageNavLink.count()) === 0) {
    await prisma.homepageNavLink.createMany({
      data: source.navLinks.map((link, index) => ({
        href: link.href,
        label: link.label,
        sortOrder: index,
        isActive: true,
      })),
    });
  }
```

- [ ] **Step 5: Verify**

Run `npm run build && npm run typecheck && npm run lint`. Confirm `HomepageNormalizedContent` consumers (grep for `HomepageNormalizedContent` usages, notably `lib/marketing/homepage-adapter.ts` and `app/page.tsx`) still type-check — `homepage-adapter.ts` does not need changes since it doesn't currently touch `navLinks`, but re-check it compiles since it destructures the full content object.

- [ ] **Step 6: Commit**

```bash
git add lib/marketing/homepage-types.ts lib/marketing/homepage-defaults.ts lib/marketing/homepage.ts
git commit -m "feat(marketing): wire navLinks into homepage content pipeline"
```

---

### Task 8: Consume navLinks in the public homepage

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `homepageContent.navLinks` (Task 7).
- Produces: nothing new — this is a leaf consumer.

- [ ] **Step 1: Replace the hardcoded `NAV_LINKS` const with content-driven links**

In `app/page.tsx`, remove the hardcoded constant (currently lines 37-43):

```tsx
const NAV_LINKS = [
  { href: "#servicios", label: "Servicios" },
  { href: "#especialistas", label: "Especialistas" },
  { href: "#agenda", label: "Agenda" },
  { href: "#preguntas-frecuentes", label: "FAQ" },
  { href: "#contacto", label: "Contacto" },
];
```

Then change the `navbarContent.links` assignment (currently line 64, `links: NAV_LINKS,`) to read from the fetched content:

```tsx
    links: homepageContent.navLinks,
```

`homepageContent` is already in scope inside `Home()` (destructured at line 49 from `getHomepageContent()`), so no new fetch is introduced. `NAV_CTA` and `NAV_LOGIN` stay as hardcoded constants — they're not part of the spec's Navbar content gap (only the link list was named), and turning the primary CTA/login links into editable content is out of scope.

- [ ] **Step 2: Verify**

Run `npm run build && npm run typecheck && npm run lint`. Manually load the homepage and confirm the navbar renders the same 5 links as before (since Task 7's defaults/seed match the removed constant exactly).

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat(marketing): drive navbar links from homepage content instead of a hardcoded const"
```

---

### Task 9: Admin panel for nav links

**Files:**
- Create: `app/portal/admin/content/AdminHomepageNavLinksPanel.tsx`

**Interfaces:**
- Consumes: `Card` from `@/app/portal/components/ui/Card`; `fetchWithRetry`, `fetchWithTimeout` from `@/lib/http`; the nav-links API from Task 6.
- Produces: `AdminHomepageNavLinksPanel` component (no props). Task 12 imports and renders it.

This mirrors `app/portal/admin/content/AdminHomepageSocialLinksPanel.tsx` exactly, minus the icon picker (nav links have no icon).

- [ ] **Step 1: Create the panel**

```tsx
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
```

- [ ] **Step 2: Verify**

Run `npm run build && npm run typecheck && npm run lint`.

- [ ] **Step 3: Commit**

```bash
git add app/portal/admin/content/AdminHomepageNavLinksPanel.tsx
git commit -m "feat(admin): add nav links CMS panel"
```

---

### Task 10: CollapsibleCard controlled-open support + Settings section slugs

**Files:**
- Modify: `app/portal/admin/content/components/CollapsibleCard.tsx`
- Modify: `app/portal/admin/content/AdminHomepageSettingsPanel.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `CollapsibleCard` gains optional `slug?: string` and `forceOpenSlug?: string | null` props — when `forceOpenSlug` matches `slug`, the card renders open regardless of its own internal state, and stays backward-compatible (existing internal `useState(defaultOpen)` behavior is unchanged when the new props are omitted, so nothing else in the codebase that renders `CollapsibleCard` needs to change). `AdminHomepageSettingsPanel` gains an optional `openSlug?: string | null` prop that it forwards to each section's `CollapsibleCard`. Task 12 passes `openSlug` when deep-linking from the new sidebar into "Información superior" / "Acciones flotantes".

- [ ] **Step 1: Add controlled-open support to `CollapsibleCard`**

Replace the full contents of `app/portal/admin/content/components/CollapsibleCard.tsx`:

```tsx
"use client";

import { useEffect, useState, type ReactNode } from "react";

type Props = {
  title: string;
  description: string;
  badge?: string;
  defaultOpen?: boolean;
  slug?: string;
  forceOpenSlug?: string | null;
  children: ReactNode;
};

export function CollapsibleCard({ title, description, badge, defaultOpen = true, slug, forceOpenSlug, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (forceOpenSlug && slug && forceOpenSlug === slug) {
      setOpen(true);
    }
  }, [forceOpenSlug, slug]);

  return (
    <div
      id={slug ? `section-${slug}` : undefined}
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs shadow-slate-100/60 transition-colors dark:border-surface-muted/80 dark:bg-surface-elevated/80 dark:shadow-surface-dark"
    >
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition hover:bg-slate-50/70 dark:hover:bg-surface-muted/20"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
            {badge && (
              <span className="rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-teal dark:bg-brand-teal/20 dark:text-accent-cyan">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        <span
          className="flex-shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open && <div className="border-t border-slate-100 px-6 py-5 dark:border-surface-muted">{children}</div>}
    </div>
  );
}
```

`useEffect` is added to the import; everything else about the existing uncontrolled behavior (`defaultOpen`, internal toggle) is unchanged.

- [ ] **Step 2: Add slugs and `openSlug` prop to `AdminHomepageSettingsPanel`**

In `app/portal/admin/content/AdminHomepageSettingsPanel.tsx`:

1. Add `slug` to the `SectionConfig` type (currently lines 130-134):

```ts
type SectionConfig = {
  slug: string;
  title: string;
  description: string;
  fields: FieldConfig[];
};
```

2. Add a `slug` to each of the 9 entries in `SECTIONS` (currently lines 136-263), matching this mapping (title → slug):

| Title | slug |
|---|---|
| Identidad de la empresa | `identidad` |
| Información superior | `info-superior` |
| Hero principal | `hero` |
| Sección servicios | `servicios` |
| Sección especialistas | `especialistas` |
| Agenda | `agenda` |
| Contacto | `contacto` |
| Acciones flotantes | `acciones-flotantes` |
| SEO y metadatos | `seo` |

e.g. the "Información superior" entry becomes:

```ts
  {
    slug: "info-superior",
    title: "Información superior",
    description: "Contenido del InfoBar visible en la parte superior del homepage.",
    fields: [
```

Apply the same `slug: "..."` insertion as the first key of each of the other 8 objects in the `SECTIONS` array, using the table above.

3. Change the component signature (currently `export function AdminHomepageSettingsPanel() {` at line 292) to accept the new prop:

```ts
export function AdminHomepageSettingsPanel({ openSlug }: { openSlug?: string | null } = {}) {
```

4. Update the `SECTIONS.map` render (currently lines 385-441) to pass `slug` and `forceOpenSlug`, and to open the matching section by default instead of always `i === 0` when `openSlug` is set:

```tsx
      {!loading
        ? SECTIONS.map((section, i) => (
            <CollapsibleCard
              key={section.slug}
              slug={section.slug}
              forceOpenSlug={openSlug}
              title={section.title}
              description={section.description}
              defaultOpen={openSlug ? section.slug === openSlug : i === 0}
            >
```

(the closing `</CollapsibleCard>` and everything inside is unchanged).

- [ ] **Step 3: Verify**

Run `npm run build && npm run typecheck && npm run lint`. Manually confirm `AdminHomepageSettingsPanel` still renders and behaves identically when used with no `openSlug` prop (its only current caller, `app/portal/admin/content/page.tsx`, will keep working unchanged until Task 12 replaces it).

- [ ] **Step 4: Commit**

```bash
git add app/portal/admin/content/components/CollapsibleCard.tsx app/portal/admin/content/AdminHomepageSettingsPanel.tsx
git commit -m "feat(admin): add controlled deep-link support to Settings sections"
```

---

### Task 11: ContentShell — sidebar + single-panel restructure

**Files:**
- Create: `app/portal/admin/content/ContentShell.tsx`
- Create: `app/portal/admin/content/ContentSidebar.tsx`
- Modify: `app/portal/admin/content/page.tsx`

**Interfaces:**
- Consumes: every existing panel component (`AdminHomepageSettingsPanel` with its new `openSlug` prop from Task 10, `AdminHomepageHeroStatsPanel`, `AdminHomepageServicesPanel`, `AdminHomepageSpecialistsPanel`, `AdminHomepageBookingOptionsPanel`, `AdminHomepageBookingBenefitsPanel`, `AdminHomepageSocialLinksPanel`, `AdminHomepageContactSupportItemsPanel`, `AdminHomepageLocationsPanel`, `AdminHomepageLegalLinksPanel`, `AdminHomepageFaqPanel`, `AdminCampaignsPanel`, `AdminBootstrapButton` — all already exist), and `AdminHomepageNavLinksPanel` (Task 9).
- Produces: nothing consumed by later tasks — this is the final assembly.

`ContentShell` is a client component holding which section is active (synced to `?section=` in the URL via `useSearchParams`/`router.replace`, so links are shareable and back/forward works) and rendering exactly one panel at a time in the right-hand pane, per the spec's two-pane layout. "Barra superior" and "Botones flotantes" are sidebar entries that select the `settings` section AND pass an `openSlug` down into it (`info-superior` / `acciones-flotantes` respectively) — per the user's explicit choice to deep-link into the existing Settings panel rather than duplicate its fields into standalone panels.

- [ ] **Step 1: Create `ContentSidebar.tsx`**

```tsx
"use client";

type SidebarGroup = {
  label: string;
  items: Array<{ slug: string; label: string; description: string }>;
};

const GROUPS: SidebarGroup[] = [
  {
    label: "Marca / Header",
    items: [
      { slug: "settings", label: "Textos y logo", description: "Nombre de la empresa, logo y SEO." },
      { slug: "navbar", label: "Navbar", description: "Enlaces del menú de navegación superior." },
      { slug: "infobar", label: "Barra superior", description: "Ubicación, horario, WhatsApp y email del InfoBar." },
    ],
  },
  {
    label: "Hero",
    items: [
      { slug: "hero-stats", label: "Estadísticas hero", description: "Contadores debajo de los botones principales." },
    ],
  },
  {
    label: "Servicios",
    items: [
      { slug: "services", label: "Catálogo de servicios", description: "Tarjetas de la sección '¿Qué hacemos?'." },
    ],
  },
  {
    label: "Equipo",
    items: [
      { slug: "specialists", label: "Especialistas", description: "Tarjetas del equipo clínico." },
    ],
  },
  {
    label: "Agenda",
    items: [
      { slug: "booking", label: "Opciones de agendamiento", description: "Métodos disponibles para agendar." },
      { slug: "benefits", label: "Beneficios de agendar", description: "Textos debajo del formulario de agenda." },
    ],
  },
  {
    label: "FAQ",
    items: [
      { slug: "faq", label: "Preguntas frecuentes", description: "Preguntas y respuestas + SEO estructurado." },
    ],
  },
  {
    label: "Contacto / Footer",
    items: [
      { slug: "support", label: "Canales de soporte", description: "Íconos de contacto rápido." },
      { slug: "locations", label: "Sedes / ubicaciones", description: "Tarjetas de sede con dirección y horario." },
      { slug: "legal", label: "Enlaces legales", description: "Política de privacidad, términos, etc." },
      { slug: "floating", label: "Botones flotantes", description: "WhatsApp y teléfono flotantes." },
    ],
  },
  {
    label: "Redes",
    items: [
      { slug: "social", label: "Redes sociales", description: "Íconos que enlazan a Instagram, Facebook, etc." },
    ],
  },
  {
    label: "Marketing",
    items: [
      { slug: "campaigns", label: "Campañas", description: "Banners promocionales con fecha de inicio y fin." },
    ],
  },
];

export function ContentSidebar({
  activeSection,
  onSelect,
}: {
  activeSection: string;
  onSelect: (slug: string) => void;
}) {
  return (
    <nav aria-label="Secciones del CMS" className="space-y-5 lg:sticky lg:top-6 lg:self-start">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{group.label}</p>
          <div className="mt-1 space-y-1">
            {group.items.map((item) => {
              const isActive = activeSection === item.slug;
              return (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => onSelect(item.slug)}
                  aria-current={isActive ? "page" : undefined}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-teal/60 ${
                    isActive
                      ? "bg-brand-light font-semibold text-brand-teal dark:bg-brand-teal/20 dark:text-accent-cyan"
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-surface-muted/20"
                  }`}
                >
                  <span className="block">{item.label}</span>
                  <span className="mt-0.5 block text-xs font-normal text-slate-400 dark:text-slate-500">
                    {item.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function findSectionLabel(slug: string): string {
  for (const group of GROUPS) {
    const match = group.items.find((item) => item.slug === slug);
    if (match) return match.label;
  }
  return slug;
}

export const DEFAULT_SECTION = "settings";
```

- [ ] **Step 2: Create `ContentShell.tsx`**

```tsx
"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AdminBootstrapButton } from "@/app/portal/admin/content/AdminBootstrapButton";
import { AdminCampaignsPanel } from "@/app/portal/admin/content/AdminCampaignsPanel";
import { AdminHomepageSettingsPanel } from "@/app/portal/admin/content/AdminHomepageSettingsPanel";
import { AdminHomepageHeroStatsPanel } from "@/app/portal/admin/content/AdminHomepageHeroStatsPanel";
import { AdminHomepageServicesPanel } from "@/app/portal/admin/content/AdminHomepageServicesPanel";
import { AdminHomepageSpecialistsPanel } from "@/app/portal/admin/content/AdminHomepageSpecialistsPanel";
import { AdminHomepageBookingOptionsPanel } from "@/app/portal/admin/content/AdminHomepageBookingOptionsPanel";
import { AdminHomepageBookingBenefitsPanel } from "@/app/portal/admin/content/AdminHomepageBookingBenefitsPanel";
import { AdminHomepageSocialLinksPanel } from "@/app/portal/admin/content/AdminHomepageSocialLinksPanel";
import { AdminHomepageContactSupportItemsPanel } from "@/app/portal/admin/content/AdminHomepageContactSupportItemsPanel";
import { AdminHomepageLocationsPanel } from "@/app/portal/admin/content/AdminHomepageLocationsPanel";
import { AdminHomepageLegalLinksPanel } from "@/app/portal/admin/content/AdminHomepageLegalLinksPanel";
import { AdminHomepageFaqPanel } from "@/app/portal/admin/content/AdminHomepageFaqPanel";
import { AdminHomepageNavLinksPanel } from "@/app/portal/admin/content/AdminHomepageNavLinksPanel";
import { ContentSidebar, DEFAULT_SECTION, findSectionLabel } from "@/app/portal/admin/content/ContentSidebar";

function SectionPanel({ section }: { section: string }) {
  switch (section) {
    case "settings":
      return <AdminHomepageSettingsPanel />;
    case "infobar":
      return <AdminHomepageSettingsPanel openSlug="info-superior" />;
    case "floating":
      return <AdminHomepageSettingsPanel openSlug="acciones-flotantes" />;
    case "navbar":
      return <AdminHomepageNavLinksPanel />;
    case "hero-stats":
      return <AdminHomepageHeroStatsPanel />;
    case "services":
      return <AdminHomepageServicesPanel />;
    case "specialists":
      return <AdminHomepageSpecialistsPanel />;
    case "booking":
      return <AdminHomepageBookingOptionsPanel />;
    case "benefits":
      return <AdminHomepageBookingBenefitsPanel />;
    case "social":
      return <AdminHomepageSocialLinksPanel />;
    case "support":
      return <AdminHomepageContactSupportItemsPanel />;
    case "locations":
      return <AdminHomepageLocationsPanel />;
    case "legal":
      return <AdminHomepageLegalLinksPanel />;
    case "faq":
      return <AdminHomepageFaqPanel />;
    case "campaigns":
      return <AdminCampaignsPanel />;
    default:
      return <AdminHomepageSettingsPanel />;
  }
}

function ContentShellInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSection = searchParams.get("section") ?? DEFAULT_SECTION;

  const selectSection = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", slug);
    router.replace(`/portal/admin/content?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
            Administración de contenido
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Sitio público</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Todo lo que edites aquí se refleja en el homepage público de la clínica.
          </p>
        </div>
        <AdminBootstrapButton />
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <ContentSidebar activeSection={activeSection} onSelect={selectSection} />

        <div className="min-w-0 space-y-4">
          <nav aria-label="Breadcrumb" className="text-xs font-semibold text-slate-400">
            Contenido <span aria-hidden>›</span> <span className="text-slate-600 dark:text-slate-300">{findSectionLabel(activeSection)}</span>
          </nav>
          <SectionPanel section={activeSection} />
        </div>
      </div>
    </div>
  );
}

export function ContentShell() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500 dark:text-slate-400">Cargando...</p>}>
      <ContentShellInner />
    </Suspense>
  );
}
```

`useSearchParams` requires a `Suspense` boundary in the App Router — the `Suspense` wrapper above is required, not optional decoration.

- [ ] **Step 3: Replace `app/portal/admin/content/page.tsx`**

Replace the full file (previously the 238-line single-scroll page) with:

```tsx
import { requireRole } from "@/lib/auth/require-role";
import { ContentShell } from "@/app/portal/admin/content/ContentShell";

export default async function AdminContentPage() {
  await requireRole("ADMINISTRADOR");

  return <ContentShell />;
}
```

All 12 original panel imports move into `ContentShell.tsx` (Step 2) — `page.tsx` no longer imports any panel directly.

- [ ] **Step 4: Verify**

Run `npm run build && npm run typecheck && npm run lint`. Manually test at 375px, 768px, 1280px, both themes: sidebar renders all groups with descriptions, clicking an item swaps the right panel and updates the URL's `?section=`, browser back/forward navigates between sections, reloading on a `?section=faq` URL lands directly on FAQ, "Barra superior" and "Botones flotantes" open the Settings panel with the matching `CollapsibleCard` pre-expanded (and the others collapsed), and "Navbar" shows the new nav-links panel from Task 9. Confirm no horizontal scroll on the two-column grid at 375px (it should stack to one column — `grid-cols-[260px_1fr]` only applies from `lg:` up, sidebar renders above the panel below that).

- [ ] **Step 5: Commit**

```bash
git add app/portal/admin/content/ContentShell.tsx app/portal/admin/content/ContentSidebar.tsx app/portal/admin/content/page.tsx
git commit -m "feat(admin): restructure Content CMS into sidebar + single-panel layout"
```

---

### Task 12: Sub-project 2 whole-flow review pass

**Files:** none (review-only; fix findings in the files from Tasks 5-11).

**Interfaces:** none.

- [ ] **Step 1: Manual pass at 375px, 768px, 1280px, both themes**

Confirm: the public homepage navbar still renders correctly (Task 8) and stays unaffected by admin-only changes; every one of the 14 sidebar entries (12 original + Navbar + the two Settings deep-links) loads its panel without error; creating/editing/reordering/deleting a nav link in the new panel round-trips and the public homepage navbar reflects it after `revalidate` (`app/page.tsx:1` sets `revalidate = 300` — either wait or trigger a manual refetch to confirm within the test, don't wait 5 minutes if the app has a bypass for testing).

- [ ] **Step 2: Run full verification gate**

```bash
npm run build && npm run typecheck && npm run lint && npm run test
```

- [ ] **Step 3: Fix any findings inline, then commit**

If the manual pass or gate surfaces issues, fix them in the relevant file from Tasks 5-11 and commit with a `fix(admin):` message. If clean, no commit needed for this task.

---

## Verification (both sub-projects, final)

```bash
npm run build && npm run typecheck && npm run lint && npm run test
```

Plus the manual pass described in Tasks 4 and 12, both already covering 375/768/1280px and both themes. On completion, use `superpowers:finishing-a-development-branch` to close out — this plan was executed directly on `main` per the user's standing preference (confirmed throughout Phases A/B of this same workstream), so "merge back" is not applicable; report the final commit list and offer to push to `origin/main` only if asked (the user has explicitly deferred pushing the accumulated local commits until more work is bundled).
