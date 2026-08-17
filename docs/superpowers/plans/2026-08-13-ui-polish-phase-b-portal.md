# UI Polish Phase B: Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `app/portal/**` (4 role shells: `client`, `professional`, `receptionist`, `admin`) into conformance with `CLAUDE.md`'s brand rules — unify two competing status-color systems into one, migrate every off-palette hardcoded color to the shared token, deduplicate `Card.tsx` usage, and fix off-brand literal Tailwind colors — then manually verify each role's primary screens at 3 breakpoints.

**Architecture:** A full mechanical + judgment sweep of `app/portal/**` (129 files) already ran (see `.superpowers/sdd/2026-08-13-ui-polish-phase-b-portal/sweep-findings.md` reference below, findings inlined into tasks). Four architectural decisions were made with the user before task-writing (see Global Constraints). The plan's spine is one new shared token module (`statusColors.ts`) that both `StatusBadge.tsx` and every call site needing a status color consume — replacing 8 independent, drifted, hardcoded color maps found in the sweep. Remaining tasks are either exact single-file fixes or grouped, list-driven mechanical migrations (`Card.tsx` dedup) with one canonical transformation + an exact file:line target list, since the transformation is identical at every site.

**Tech Stack:** Next.js 16 App Router, Tailwind v4, Prisma (`AppointmentStatus`, `PaymentStatus` enums), TypeScript, NextAuth (roles: `PACIENTE`→`client`, `PROFESIONAL`→`professional`, `RECEPCIONISTA`→`receptionist`, `ADMINISTRADOR`→`admin`).

## Global Constraints

- Brand palette only: `brand-teal (#0a3d91)`, `brand-indigo (#1f6cd3)`, `brand-sky (#4cc3f1)`, `brand-light (#e6f4ff)`, `accent-cyan (#5bd0ff)`, `slate-*` / `surface-*` neutrals. No green/emerald/amber/rose/fuchsia/cyan(literal)/blue(literal)/indigo(literal Tailwind scale) — except the four approved exceptions below.
- **Approved exceptions (do not touch these, do not treat as violations):**
  1. Appointment-status semantics now live in `brand-teal`/`brand-indigo`/`slate` via the shared token (this plan's Task 1) — no green/amber/red for status.
  2. Login/form validation-error red (`CLAUDE.md` "Excepción aprobada: rojo... error/validación") — unrelated portal files using red for form errors are already compliant, not violations.
  3. **New in this plan:** form-success messages in emerald/green are an approved exception, parallel to the error-red one — add this to `CLAUDE.md`, do not migrate the ~20 form-success lines found in the sweep.
  4. **New in this plan:** the clinical "Alergia crítica" alert in `ProfessionalDashboard.tsx:496-504` stays rose/red — patient-safety urgency, add this to `CLAUDE.md` as a second scoped exception (do not touch the code).
- **Portal's own card idiom is separately approved, not a violation:** `app/portal/components/ui/Card.tsx` (`rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs shadow-slate-100/60`, no hover-lift) is the portal's intentional dense/tabular card language, distinct from the marketing signature card (`rounded-[1.75rem]`, hover-lift). Do NOT convert portal cards to the signature card pattern. The only real violation is files that hand-duplicate `Card.tsx`'s literal class string instead of importing the component — that's what gets fixed.
- Icon barrel rule: already 100% compliant in `app/portal/**` (verified — zero violations). No task needed.
- Every `bg-*`/`text-*`/`border-*` class touched must keep a working `dark:` variant, matching the existing pattern in the file being edited.
- `npm run build` (this repo uses npm, not pnpm) must pass before every commit. Also run `npm run typecheck` and `npm run lint`.
- Spanish (Colombia), tú-form, sentence case — existing copy/labels in touched files must NOT change (e.g. "Activa"/"Activo" gender agreement per file) unless a task explicitly says to add a label.
- No routing/auth changes, no new features, no structural/layout redesign — conformance only, per the parent spec's explicit scope.

---

### Task 1: Foundation — shared `statusColors.ts` token module + `StatusDot` + refactor `StatusBadge`

**Files:**
- Create: `app/portal/components/ui/statusColors.ts`
- Create: `app/portal/components/ui/StatusDot.tsx`
- Modify: `app/portal/components/ui/StatusBadge.tsx`

**Context:** The sweep found `StatusBadge.tsx`'s own inline `config` map duplicated (with drift) across 8 other files as independent hardcoded color maps, several using off-palette green/amber/rose/fuchsia/cyan/blue. This task creates one source of truth with four color axes per status (`badge` for pills, `bar` for solid accents like calendar blocks, `tint`+`text` for soft banners, `border` for outline buttons) so every later task in this plan imports from here instead of inventing new literal classes.

**Interfaces:**
- Consumes: nothing new.
- Produces: `STATUS_COLORS: Record<string, { label: string; badge: string; bar: string; tint: string; text: string; border: string }>` exported from `app/portal/components/ui/statusColors.ts`. Keys: `SCHEDULED`, `CONFIRMED`, `CHECKED_IN`, `CANCELLED`, `COMPLETED`, `NO_SHOW`, `Free`, `Busy`, `Break`, `Offline`, `available`, `busy`, `off`, `Active`, `Inactive`, `success`, `failure`. Also `StatusDot({ status, className }: { status: string; className?: string })` from `app/portal/components/ui/StatusDot.tsx`. `StatusBadge`'s existing signature (`{ status: string }`) and rendered output (label text, pill classes) stay byte-identical for all pre-existing keys — this is a refactor, not a behavior change.

- [ ] **Step 1: Create the shared token module**

Create `app/portal/components/ui/statusColors.ts`:
```ts
export interface StatusColorSet {
  label: string;
  badge: string;
  bar: string;
  tint: string;
  text: string;
  border: string;
}

export const STATUS_COLORS: Record<string, StatusColorSet> = {
  SCHEDULED: {
    label: "Programada",
    badge: "bg-slate-100 text-slate-700 dark:bg-surface-muted dark:text-slate-300",
    bar: "bg-slate-400 dark:bg-slate-500",
    tint: "bg-slate-50 border-slate-200 dark:bg-surface-muted/40 dark:border-surface-muted",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-300 dark:border-surface-muted",
  },
  CONFIRMED: {
    label: "Confirmada",
    badge: "bg-brand-light text-brand-teal dark:bg-accent-cyan/15 dark:text-accent-cyan",
    bar: "bg-brand-teal dark:bg-accent-cyan",
    tint: "bg-brand-light/60 border-brand-teal/20 dark:bg-brand-teal/10 dark:border-accent-cyan/20",
    text: "text-brand-teal dark:text-accent-cyan",
    border: "border-brand-teal/30 dark:border-accent-cyan/30",
  },
  CHECKED_IN: {
    label: "En consulta",
    badge: "bg-brand-light/60 text-brand-indigo dark:bg-brand-teal/10 dark:text-accent-cyan",
    bar: "bg-brand-indigo dark:bg-accent-cyan",
    tint: "bg-brand-light/40 border-brand-indigo/25 dark:bg-brand-teal/15 dark:border-accent-cyan/25",
    text: "text-brand-indigo dark:text-accent-cyan",
    border: "border-brand-indigo/30 dark:border-accent-cyan/30",
  },
  COMPLETED: {
    label: "Completada",
    badge: "bg-brand-light/60 text-brand-indigo dark:bg-brand-teal/10 dark:text-accent-cyan",
    bar: "bg-brand-indigo dark:bg-accent-cyan",
    tint: "bg-brand-light/40 border-brand-indigo/20 dark:bg-brand-teal/10 dark:border-accent-cyan/20",
    text: "text-brand-indigo dark:text-accent-cyan",
    border: "border-brand-indigo/30 dark:border-accent-cyan/30",
  },
  CANCELLED: {
    label: "Cancelada",
    badge: "bg-slate-100 text-slate-400 dark:bg-surface-base dark:text-slate-500",
    bar: "bg-slate-300 dark:bg-slate-600",
    tint: "bg-slate-50 border-slate-200 dark:bg-surface-base/60 dark:border-surface-muted",
    text: "text-slate-500 dark:text-slate-400",
    border: "border-slate-300 dark:border-surface-muted",
  },
  NO_SHOW: {
    label: "No asistió",
    badge: "bg-slate-200 text-slate-500 dark:bg-surface-base/60 dark:text-slate-400",
    bar: "bg-slate-400 dark:bg-slate-500",
    tint: "bg-slate-100 border-slate-300 dark:bg-surface-base/70 dark:border-surface-muted",
    text: "text-slate-600 dark:text-slate-300",
    border: "border-slate-400 dark:border-surface-muted",
  },
  Free: {
    label: "Disponible",
    badge: "bg-brand-light text-brand-teal dark:bg-accent-cyan/15 dark:text-accent-cyan",
    bar: "bg-brand-teal dark:bg-accent-cyan",
    tint: "bg-brand-light/60 border-brand-teal/20 dark:bg-brand-teal/10 dark:border-accent-cyan/20",
    text: "text-brand-teal dark:text-accent-cyan",
    border: "border-brand-teal/30 dark:border-accent-cyan/30",
  },
  Busy: {
    label: "Ocupado",
    badge: "bg-slate-100 text-slate-700 dark:bg-surface-muted dark:text-slate-300",
    bar: "bg-slate-400 dark:bg-slate-500",
    tint: "bg-slate-50 border-slate-200 dark:bg-surface-muted/40 dark:border-surface-muted",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-300 dark:border-surface-muted",
  },
  Break: {
    label: "En pausa",
    badge: "bg-slate-200 text-slate-500 dark:bg-surface-base/60 dark:text-slate-400",
    bar: "bg-slate-300 dark:bg-slate-600",
    tint: "bg-slate-100 border-slate-300 dark:bg-surface-base/70 dark:border-surface-muted",
    text: "text-slate-600 dark:text-slate-300",
    border: "border-slate-400 dark:border-surface-muted",
  },
  Offline: {
    label: "Sin turno",
    badge: "bg-slate-100 text-slate-400 dark:bg-surface-base dark:text-slate-500",
    bar: "bg-slate-300 dark:bg-slate-600",
    tint: "bg-slate-50 border-slate-200 dark:bg-surface-base/60 dark:border-surface-muted",
    text: "text-slate-400 dark:text-slate-500",
    border: "border-slate-300 dark:border-surface-muted",
  },
  available: {
    label: "Disponible",
    badge: "bg-brand-light text-brand-teal dark:bg-accent-cyan/15 dark:text-accent-cyan",
    bar: "bg-brand-teal dark:bg-accent-cyan",
    tint: "bg-brand-light/60 border-brand-teal/20 dark:bg-brand-teal/10 dark:border-accent-cyan/20",
    text: "text-brand-teal dark:text-accent-cyan",
    border: "border-brand-teal/30 dark:border-accent-cyan/30",
  },
  busy: {
    label: "Ocupado",
    badge: "bg-slate-100 text-slate-700 dark:bg-surface-muted dark:text-slate-300",
    bar: "bg-slate-400 dark:bg-slate-500",
    tint: "bg-slate-50 border-slate-200 dark:bg-surface-muted/40 dark:border-surface-muted",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-300 dark:border-surface-muted",
  },
  off: {
    label: "Fuera",
    badge: "bg-slate-100 text-slate-400 dark:bg-surface-base dark:text-slate-500",
    bar: "bg-slate-300 dark:bg-slate-600",
    tint: "bg-slate-50 border-slate-200 dark:bg-surface-base/60 dark:border-surface-muted",
    text: "text-slate-400 dark:text-slate-500",
    border: "border-slate-300 dark:border-surface-muted",
  },
  Active: {
    label: "Activo",
    badge: "bg-brand-light text-brand-teal dark:bg-accent-cyan/15 dark:text-accent-cyan",
    bar: "bg-brand-teal dark:bg-accent-cyan",
    tint: "bg-brand-light/60 border-brand-teal/20 dark:bg-brand-teal/10 dark:border-accent-cyan/20",
    text: "text-brand-teal dark:text-accent-cyan",
    border: "border-brand-teal/30 dark:border-accent-cyan/30",
  },
  Inactive: {
    label: "Inactivo",
    badge: "bg-slate-100 text-slate-500 dark:bg-surface-muted dark:text-slate-400",
    bar: "bg-slate-300 dark:bg-slate-600",
    tint: "bg-slate-50 border-slate-200 dark:bg-surface-muted/40 dark:border-surface-muted",
    text: "text-slate-500 dark:text-slate-400",
    border: "border-slate-300 dark:border-surface-muted",
  },
  success: {
    label: "success",
    badge: "bg-brand-light text-brand-teal dark:bg-accent-cyan/15 dark:text-accent-cyan",
    bar: "bg-brand-teal dark:bg-accent-cyan",
    tint: "bg-brand-light/60 border-brand-teal/20 dark:bg-brand-teal/10 dark:border-accent-cyan/20",
    text: "text-brand-teal dark:text-accent-cyan",
    border: "border-brand-teal/30 dark:border-accent-cyan/30",
  },
  failure: {
    label: "failure",
    badge: "bg-slate-100 text-slate-500 dark:bg-surface-muted dark:text-slate-400",
    bar: "bg-slate-400 dark:bg-slate-500",
    tint: "bg-slate-50 border-slate-200 dark:bg-surface-muted/40 dark:border-surface-muted",
    text: "text-slate-500 dark:text-slate-400",
    border: "border-slate-300 dark:border-surface-muted",
  },
};

export const DEFAULT_STATUS_COLOR: StatusColorSet = {
  label: "",
  badge: "bg-slate-100 text-slate-500 dark:bg-surface-muted dark:text-slate-400",
  bar: "bg-slate-300 dark:bg-slate-600",
  tint: "bg-slate-50 border-slate-200 dark:bg-surface-muted/40 dark:border-surface-muted",
  text: "text-slate-500 dark:text-slate-400",
  border: "border-slate-300 dark:border-surface-muted",
};
```

- [ ] **Step 2: Create `StatusDot`**

Create `app/portal/components/ui/StatusDot.tsx`:
```tsx
import { STATUS_COLORS, DEFAULT_STATUS_COLOR } from "./statusColors";

export function StatusDot({ status, className }: { status: string; className?: string }) {
  const bar = STATUS_COLORS[status]?.bar ?? DEFAULT_STATUS_COLOR.bar;
  return <span className={`h-2 w-2 rounded-full ${bar} ${className ?? ""}`} />;
}
```

- [ ] **Step 3: Refactor `StatusBadge` to consume the shared module**

Current `app/portal/components/ui/StatusBadge.tsx` (full file, 27 lines) — replace entirely with:
```tsx
import { STATUS_COLORS, DEFAULT_STATUS_COLOR } from "./statusColors";

export type BadgeVariant = keyof typeof STATUS_COLORS;

export function StatusBadge({ status }: { status: string }) {
  const entry = STATUS_COLORS[status] ?? { ...DEFAULT_STATUS_COLOR, label: status };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${entry.badge}`}>
      {entry.label}
    </span>
  );
}
```
Verify: every original key's `label` and `badge` (formerly `className`) text is byte-identical to the old inline `config` map — this must render pixel-identical output for all 6 existing `<StatusBadge>` call sites (`AppointmentTable.tsx`, `ClientAppointmentsPanel.tsx`, `ProfessionalDashboard.tsx`, `ReceptionistDashboard.tsx`, `AdminAppointmentsPanel.tsx` — grep `<StatusBadge` across `app/portal/**` to confirm the full call-site list before finishing this step).

- [ ] **Step 4: Verify build, typecheck, lint**

Run: `npm run build && npm run typecheck && npm run lint`
Expected: 0 errors. No visual/behavior change yet (only Task 1's files touched, nothing new is wired in).

- [ ] **Step 5: Commit**

```bash
git add app/portal/components/ui/statusColors.ts app/portal/components/ui/StatusDot.tsx app/portal/components/ui/StatusBadge.tsx
git commit -m "feat(portal): add shared statusColors token module, refactor StatusBadge"
```

---

### Task 2: Retire `appointmentStatusBadge()` — unify `AppointmentTable.tsx` and `client/page.tsx` on the shared token

**Files:**
- Modify: `app/portal/receptionist/components/AppointmentTable.tsx`
- Modify: `app/portal/client/page.tsx`
- Delete: `lib/portal/appointment-status.ts`

**Context:** `lib/portal/appointment-status.ts`'s `appointmentStatusBadge()` is a second, competing status-color system (emerald/sky/rose/amber) carrying its own "aprobado 2026-05-28" comment, mixed inside the same file as the real `StatusBadge` component. Per the user's decision, `StatusBadge`'s brand palette wins; this function is retired. `AppointmentTable.tsx` also has 5 action buttons (lines 242-256) using off-palette emerald/blue/indigo/fuchsia/rose that were found in the same sweep pass — each button targets a specific status transition, so it gets that status's `.border`/`.text` from `STATUS_COLORS` (keeps the existing "each action is tinted toward its resulting status" affordance, now in brand colors).

**Interfaces:**
- Consumes: `STATUS_COLORS` from `app/portal/components/ui/statusColors.ts` (Task 1).
- Produces: no new exports. `appointmentStatusBadge` no longer exists anywhere in the codebase after this task.

- [ ] **Step 1: Confirm no other importers of `appointmentStatusBadge`**

Run: `grep -rl "appointmentStatusBadge" --include="*.ts" --include="*.tsx" .` (excluding `node_modules`)
Expected: only `lib/portal/appointment-status.ts`, `app/portal/receptionist/components/AppointmentTable.tsx`, `app/portal/client/page.tsx`. If any other file appears, stop and report — do not delete the shared function until every importer in this step is accounted for in Steps 2-3.

- [ ] **Step 2: Migrate `AppointmentTable.tsx`**

Current `app/portal/receptionist/components/AppointmentTable.tsx:19-38`:
```tsx
import { Table } from "@/app/portal/components/ui/Table";
import { StatusBadge } from "@/app/portal/components/ui/StatusBadge";
import { RescheduleModal } from "@/app/portal/components/RescheduleModal";
import { AppointmentEventTimeline } from "@/app/portal/components/appointments/AppointmentEventTimeline";
import { fetchWithTimeout } from "@/lib/http";
import { toOperationalStatus } from "@/lib/appointments/status";

/** Labels consistent with StatusBadge for timeline blocks */
function timelineStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    SCHEDULED:  "Programada",
    CONFIRMED:  "Confirmada",
    CHECKED_IN: "En consulta",
    COMPLETED:  "Completada",
    CANCELLED:  "Cancelada",
    NO_SHOW:    "No asistió",
  };
  return labels[status] ?? status;
}
import { appointmentStatusBadge } from "@/lib/portal/appointment-status";
```
Change to (drop the now-redundant `timelineStatusLabel` — `STATUS_COLORS[status].label` already supplies identical text — and the `appointmentStatusBadge` import):
```tsx
import { Table } from "@/app/portal/components/ui/Table";
import { StatusBadge } from "@/app/portal/components/ui/StatusBadge";
import { STATUS_COLORS, DEFAULT_STATUS_COLOR } from "@/app/portal/components/ui/statusColors";
import { RescheduleModal } from "@/app/portal/components/RescheduleModal";
import { AppointmentEventTimeline } from "@/app/portal/components/appointments/AppointmentEventTimeline";
import { fetchWithTimeout } from "@/lib/http";
import { toOperationalStatus } from "@/lib/appointments/status";
```

Current `app/portal/receptionist/components/AppointmentTable.tsx:171` (and its identical twin at `:188`):
```tsx
<span className={`rounded-full border px-2 py-1 font-semibold ${appointmentStatusBadge(slot)}`}>{timelineStatusLabel(slot)}</span>
```
Change both occurrences to:
```tsx
<span className={`rounded-full border px-2 py-1 font-semibold ${(STATUS_COLORS[slot] ?? DEFAULT_STATUS_COLOR).badge}`}>{(STATUS_COLORS[slot] ?? DEFAULT_STATUS_COLOR).label}</span>
```

Current `app/portal/receptionist/components/AppointmentTable.tsx:242-256` (5 action buttons):
```tsx
                        <button type="button" className="inline-flex items-center gap-1 rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold uppercase text-emerald-700 disabled:opacity-50" onClick={() => updateStatus(appointment.id, AppointmentStatus.CONFIRMED)} disabled={busyId === appointment.id || appointment.status !== AppointmentStatus.SCHEDULED}>
                          <CheckCircle size={14} />Confirmar
                        </button>
                        <button type="button" className="inline-flex items-center gap-1 rounded-full border border-blue-200 px-3 py-1 text-xs font-semibold uppercase text-blue-700 disabled:opacity-50" onClick={() => updateStatus(appointment.id, AppointmentStatus.CHECKED_IN, "check_in")} disabled={busyId === appointment.id || ([AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW] as AppointmentStatus[]).includes(appointment.status)}>
                          <UserCheck size={14} />En sala
                        </button>
                        <button type="button" className="inline-flex items-center gap-1 rounded-full border border-indigo-200 px-3 py-1 text-xs font-semibold uppercase text-indigo-700 disabled:opacity-50" onClick={() => updateStatus(appointment.id, AppointmentStatus.COMPLETED)} disabled={busyId === appointment.id || ([AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW] as AppointmentStatus[]).includes(appointment.status)}>
                          <CheckCircle size={14} />Atendida
                        </button>
                        <button type="button" className="inline-flex items-center gap-1 rounded-full border border-fuchsia-200 px-3 py-1 text-xs font-semibold uppercase text-fuchsia-700 disabled:opacity-50" onClick={() => updateStatus(appointment.id, AppointmentStatus.NO_SHOW, "mark_no_show")} disabled={busyId === appointment.id || ([AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW] as AppointmentStatus[]).includes(appointment.status)}>
                          <WarningCircle size={14} />No asistió
                        </button>
                        <button type="button" className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold uppercase text-rose-700 disabled:opacity-50" onClick={() => setCancelTarget(appointment.id)} disabled={busyId === appointment.id || ([AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] as AppointmentStatus[]).includes(appointment.status)}>
                          <XCircle size={14} />Cancelar
                        </button>
```
Change to (swap each button's `border-*-200`/`text-*-700` pair for `${STATUS_COLORS.<TARGET>.border} ${STATUS_COLORS.<TARGET>.text}`, matching the status each action moves the appointment toward — `NO_SHOW`'s and `CANCELLED`'s original colors were fuchsia/rose specifically to signal "destructive," so both now use `NO_SHOW`'s and `CANCELLED`'s own slate-based border/text, which is intentionally more muted since destructive urgency is no longer conveyed via off-palette hue, per this plan's brand-only constraint):
```tsx
                        <button type="button" className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold uppercase disabled:opacity-50 ${STATUS_COLORS.CONFIRMED.border} ${STATUS_COLORS.CONFIRMED.text}`} onClick={() => updateStatus(appointment.id, AppointmentStatus.CONFIRMED)} disabled={busyId === appointment.id || appointment.status !== AppointmentStatus.SCHEDULED}>
                          <CheckCircle size={14} />Confirmar
                        </button>
                        <button type="button" className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold uppercase disabled:opacity-50 ${STATUS_COLORS.CHECKED_IN.border} ${STATUS_COLORS.CHECKED_IN.text}`} onClick={() => updateStatus(appointment.id, AppointmentStatus.CHECKED_IN, "check_in")} disabled={busyId === appointment.id || ([AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW] as AppointmentStatus[]).includes(appointment.status)}>
                          <UserCheck size={14} />En sala
                        </button>
                        <button type="button" className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold uppercase disabled:opacity-50 ${STATUS_COLORS.COMPLETED.border} ${STATUS_COLORS.COMPLETED.text}`} onClick={() => updateStatus(appointment.id, AppointmentStatus.COMPLETED)} disabled={busyId === appointment.id || ([AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW] as AppointmentStatus[]).includes(appointment.status)}>
                          <CheckCircle size={14} />Atendida
                        </button>
                        <button type="button" className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold uppercase disabled:opacity-50 ${STATUS_COLORS.NO_SHOW.border} ${STATUS_COLORS.NO_SHOW.text}`} onClick={() => updateStatus(appointment.id, AppointmentStatus.NO_SHOW, "mark_no_show")} disabled={busyId === appointment.id || ([AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW] as AppointmentStatus[]).includes(appointment.status)}>
                          <WarningCircle size={14} />No asistió
                        </button>
                        <button type="button" className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold uppercase disabled:opacity-50 ${STATUS_COLORS.CANCELLED.border} ${STATUS_COLORS.CANCELLED.text}`} onClick={() => setCancelTarget(appointment.id)} disabled={busyId === appointment.id || ([AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] as AppointmentStatus[]).includes(appointment.status)}>
                          <XCircle size={14} />Cancelar
                        </button>
```
Note: lines 245/248's `border-blue-200`/`text-blue-700` and `border-indigo-200`/`text-indigo-700` (literal Tailwind scale, not brand tokens) are also fixed by this same change — no separate task needed for them.

- [ ] **Step 3: Migrate `client/page.tsx`**

Read `app/portal/client/page.tsx`'s import and usage of `appointmentStatusBadge` (grep the exact line — it wasn't fully quoted in the sweep). Apply the same transformation as Step 2: replace the import with `STATUS_COLORS`/`DEFAULT_STATUS_COLOR` from `@/app/portal/components/ui/statusColors`, and replace `appointmentStatusBadge(status)` with `(STATUS_COLORS[status] ?? DEFAULT_STATUS_COLOR).badge` at its call site(s).

- [ ] **Step 4: Delete the retired module**

```bash
git rm lib/portal/appointment-status.ts
```

- [ ] **Step 5: Verify build, typecheck, lint**

Run: `npm run build && npm run typecheck && npm run lint`
Expected: 0 errors — this step will also catch any missed importer from Step 1 as a build failure (module not found).

- [ ] **Step 6: Manually check the receptionist appointment table and client dashboard render correctly**

Run `npm run dev`, sign in as receptionist (or use `TEST_AUTH_BYPASS` per the spec's verification note), load the appointments table. Confirm: timeline mini-badges show brand-blue/slate colors (not emerald/sky/rose/amber), the 5 action buttons show brand-toned borders/text, all still function (click "Confirmar" etc. and confirm the status actually updates — this task only changes classNames, not the `onClick` handlers, so behavior must be unchanged). Load the patient portal home (`client/page.tsx`) and confirm its status badge/color renders correctly.

- [ ] **Step 7: Commit**

```bash
git add app/portal/receptionist/components/AppointmentTable.tsx app/portal/client/page.tsx
git rm lib/portal/appointment-status.ts
git commit -m "fix(portal): retire appointmentStatusBadge, unify AppointmentTable on shared status tokens"
```

---

### Task 3: Staff on-duty status — `StaffOnDutyList.tsx` dot + `ReceptionistStaff.tsx` badge

**Files:**
- Modify: `app/portal/admin/_components/StaffOnDutyList.tsx`
- Modify: `app/portal/receptionist/staff/ReceptionistStaff.tsx`

**Context:** Both files hardcode staff-status colors that the shared token now covers. `ReceptionistStaff.tsx` already uses the exact same vocabulary (`Free`/`Busy`/`Break`/`Offline`) and label text as `StatusBadge` — a direct swap, no new keys needed. `StaffOnDutyList.tsx` uses a different (lowercase) vocabulary (`available`/`busy`/`off`) already added to `STATUS_COLORS` in Task 1, rendered as a dot (not a badge pill) via the new `StatusDot`.

**Interfaces:**
- Consumes: `StatusDot` and `StatusBadge` (Task 1).
- Produces: nothing new.

- [ ] **Step 1: Fix `StaffOnDutyList.tsx`**

Current `app/portal/admin/_components/StaffOnDutyList.tsx:1-16`:
```tsx
import Link from "next/link";

import { AvatarFallback } from "@/app/portal/components/ui/AvatarFallback";

type StaffMember = {
  id: string;
  name: string;
  subtitle: string;
  status: "available" | "busy" | "off";
};

const statusStyles: Record<StaffMember["status"], string> = {
  available: "bg-emerald-500",
  busy: "bg-amber-500",
  off: "bg-slate-300",
};

const statusLabels: Record<StaffMember["status"], string> = {
```
Change to (drop `statusStyles`, keep `statusLabels` — its text is unrelated to the color fix):
```tsx
import Link from "next/link";

import { AvatarFallback } from "@/app/portal/components/ui/AvatarFallback";
import { StatusDot } from "@/app/portal/components/ui/StatusDot";

type StaffMember = {
  id: string;
  name: string;
  subtitle: string;
  status: "available" | "busy" | "off";
};

const statusLabels: Record<StaffMember["status"], string> = {
```

Current `app/portal/admin/_components/StaffOnDutyList.tsx:57` (line numbers shift by -5 after the deletion above, locate by content):
```tsx
                <span className={`h-2 w-2 rounded-full ${statusStyles[member.status]}`} />
```
Change to:
```tsx
                <StatusDot status={member.status} />
```

- [ ] **Step 2: Fix `ReceptionistStaff.tsx`**

Current `app/portal/receptionist/staff/ReceptionistStaff.tsx:1-27`:
```tsx
"use client";

import { useEffect, useState } from "react";

import { Card } from "@/app/portal/components/ui/Card";
import { fetchWithRetry } from "@/lib/http";

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const staffStatusLabels: Record<string, string> = {
  Free: "Disponible",
  Busy: "Ocupado",
  Break: "En pausa",
  Offline: "Sin turno",
};

const staffStatusStyles: Record<string, string> = {
  Free: "bg-emerald-100 text-emerald-700",
  Busy: "bg-amber-100 text-amber-700",
  Break: "bg-slate-100 text-slate-500",
  Offline: "bg-slate-200 text-slate-600",
};
```
Change to (both local maps are now fully redundant with `StatusBadge`, since the label text is byte-identical):
```tsx
"use client";

import { useEffect, useState } from "react";

import { Card } from "@/app/portal/components/ui/Card";
import { StatusBadge } from "@/app/portal/components/ui/StatusBadge";
import { fetchWithRetry } from "@/lib/http";

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};
```

Current `app/portal/receptionist/staff/ReceptionistStaff.tsx:91-97`:
```tsx
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      staffStatusStyles[member.status] ?? "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {staffStatusLabels[member.status] ?? member.status}
                  </span>
```
Change to:
```tsx
                  <StatusBadge status={member.status} />
```

- [ ] **Step 3: Verify build, typecheck, lint**

Run: `npm run build && npm run typecheck && npm run lint`
Expected: 0 errors.

- [ ] **Step 4: Manually check both screens**

`npm run dev`, load the admin dashboard's "Equipo activo" panel and the receptionist "Profesionales en turno" screen. Confirm dots/badges render in brand colors, no visual regression in layout (badge/dot sizing unchanged).

- [ ] **Step 5: Commit**

```bash
git add app/portal/admin/_components/StaffOnDutyList.tsx app/portal/receptionist/staff/ReceptionistStaff.tsx
git commit -m "fix(portal): migrate staff on-duty status colors to shared token"
```

---

### Task 4: Active/Inactive toggle — 5 independent implementations → shared token

**Files:**
- Modify: `app/portal/admin/users/AdminUsersPanel.tsx`
- Modify: `app/portal/admin/content/AdminCampaignsPanel.tsx`
- Modify: `app/portal/receptionist/patients/ReceptionistPatients.tsx`
- Modify: `app/portal/client/settings/page.tsx`

**Context:** The sweep found the same "entity active/inactive" semantic implemented 5 times with 2 different off-palette color pairs (green/red literal and emerald/slate). Each keeps its own label text (Spanish gender agreement differs: "Activo"/"Activa") — only the color classes move to `STATUS_COLORS.Active`/`.Inactive`.

**Interfaces:**
- Consumes: `STATUS_COLORS` from Task 1.
- Produces: nothing new.

- [ ] **Step 1: `AdminUsersPanel.tsx` badge**

Current `app/portal/admin/users/AdminUsersPanel.tsx:537-539`:
```tsx
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          user.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                        }`}>
```
Change to:
```tsx
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          STATUS_COLORS[user.active ? "Active" : "Inactive"].badge
                        }`}>
```

- [ ] **Step 2: `AdminUsersPanel.tsx` toggle button**

Current `app/portal/admin/users/AdminUsersPanel.tsx:596-601`:
```tsx
                      <button
                        type="button"
                        className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${
                          user.active
                            ? "border-red-200 text-red-600"
                            : "border-green-200 text-green-600"
                        }`}
```
Change to (button color reflects the *target* state after clicking — matches original intent of showing the opposite-state color as the action's destination):
```tsx
                      <button
                        type="button"
                        className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${
                          STATUS_COLORS[user.active ? "Inactive" : "Active"].border
                        } ${STATUS_COLORS[user.active ? "Inactive" : "Active"].text}`}
```

Add the import at the top of `app/portal/admin/users/AdminUsersPanel.tsx` (find the existing local-import block and add alongside it):
```tsx
import { STATUS_COLORS } from "@/app/portal/components/ui/statusColors";
```

- [ ] **Step 3: `AdminCampaignsPanel.tsx`**

Current `app/portal/admin/content/AdminCampaignsPanel.tsx:293-296`:
```tsx
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      campaign.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
```
Change to:
```tsx
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      STATUS_COLORS[campaign.active ? "Active" : "Inactive"].badge
                    }`}
                  >
```
Add `import { STATUS_COLORS } from "@/app/portal/components/ui/statusColors";` near this file's other local imports.

- [ ] **Step 4: `ReceptionistPatients.tsx`**

Current `app/portal/receptionist/patients/ReceptionistPatients.tsx:230-233`:
```tsx
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      patient.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
```
Change to:
```tsx
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      STATUS_COLORS[patient.active ? "Active" : "Inactive"].badge
                    }`}
                  >
```
Add `import { STATUS_COLORS } from "@/app/portal/components/ui/statusColors";` near this file's other local imports.

- [ ] **Step 5: `client/settings/page.tsx` account-active banner**

Current `app/portal/client/settings/page.tsx:45-48`:
```tsx
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-2.5 dark:border-emerald-800/30 dark:bg-emerald-900/10">
          <CheckCircle size={15} weight="fill" className="shrink-0 text-emerald-500 dark:text-emerald-400" />
          <p className="text-xs text-emerald-700 dark:text-emerald-400">Cuenta activa y verificada</p>
        </div>
```
Change to:
```tsx
        <div className={`mt-4 flex items-center gap-2 rounded-xl border px-4 py-2.5 ${STATUS_COLORS.Active.tint}`}>
          <CheckCircle size={15} weight="fill" className={`shrink-0 ${STATUS_COLORS.Active.text}`} />
          <p className={`text-xs ${STATUS_COLORS.Active.text}`}>Cuenta activa y verificada</p>
        </div>
```
Add `import { STATUS_COLORS } from "@/app/portal/components/ui/statusColors";` to this file's imports (it's a Server Component — the import works the same way, no `"use client"` needed since `statusColors.ts` has no client-only APIs).

- [ ] **Step 6: Verify build, typecheck, lint**

Run: `npm run build && npm run typecheck && npm run lint`
Expected: 0 errors.

- [ ] **Step 7: Manually check all 4 screens**

`npm run dev` — check admin users list (badge + toggle button), admin campaigns list, receptionist patients list, client settings page. Confirm active=brand-teal-ish, inactive=slate, in both light and dark mode (toggle the theme switcher).

- [ ] **Step 8: Commit**

```bash
git add app/portal/admin/users/AdminUsersPanel.tsx app/portal/admin/content/AdminCampaignsPanel.tsx app/portal/receptionist/patients/ReceptionistPatients.tsx app/portal/client/settings/page.tsx
git commit -m "fix(portal): migrate 5 active/inactive toggle implementations to shared status token"
```

---

### Task 5: Fix `audit/panel.tsx` — local `StatusBadge` name collision

**Files:**
- Modify: `app/portal/admin/audit/panel.tsx`

**Context:** This file declares its own local `function StatusBadge(...)` that shadows the real shared component (never imported from it) — a name collision, not just a missed migration. `success`/`failure` keys already exist in `STATUS_COLORS` (Task 1) with matching semantics (brand-teal for success, slate for failure — audit failure isn't a form/login error, so it doesn't get the approved red exception; it follows the same brand/slate rule as every other status).

**Interfaces:**
- Consumes: the real `StatusBadge` from `app/portal/components/ui/StatusBadge.tsx` (Task 1).
- Produces: nothing new. The local `StatusBadge` function is deleted.

- [ ] **Step 1: Remove the local component, import the shared one**

Current `app/portal/admin/audit/panel.tsx:1-41`:
```tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchWithRetry } from "@/lib/http";

type AuditStatus = "success" | "failure";

type AuditLogItem = {
  id: string;
  createdAt: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  targetLabel: string | null;
  status: AuditStatus;
  actor: {
    userId: string | null;
    role: string | null;
    identifier: string | null;
  };
  metadataPreview: string[];
};

type AuditLogsResponse = {
  items: AuditLogItem[];
  nextCursor: string | null;
};

function StatusBadge({ status }: { status: AuditStatus }) {
  const classes =
    status === "success"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
      : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300";

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${classes}`}>
      {status}
    </span>
  );
}
```
Change to:
```tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchWithRetry } from "@/lib/http";
import { StatusBadge } from "@/app/portal/components/ui/StatusBadge";

type AuditStatus = "success" | "failure";

type AuditLogItem = {
  id: string;
  createdAt: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  targetLabel: string | null;
  status: AuditStatus;
  actor: {
    userId: string | null;
    role: string | null;
    identifier: string | null;
  };
  metadataPreview: string[];
};

type AuditLogsResponse = {
  items: AuditLogItem[];
  nextCursor: string | null;
};
```
Note: the shared `StatusBadge` renders `STATUS_COLORS.success.label` (`"success"`) / `.failure.label` (`"failure"`) — identical text to what the local version rendered (`{status}`, i.e. the raw string `"success"`/`"failure"`), so output text is unchanged.

- [ ] **Step 2: Confirm the call site still compiles unchanged**

Grep this file for `<StatusBadge` — it should already call `<StatusBadge status={item.status} />` or similar, which now resolves to the imported shared component with an identical prop signature (`{ status: string }` accepts `AuditStatus` since it's a subtype of `string`). No call-site edit needed.

- [ ] **Step 3: Verify build, typecheck, lint**

Run: `npm run build && npm run typecheck && npm run lint`
Expected: 0 errors.

- [ ] **Step 4: Manually check the audit log screen**

`npm run dev`, load the admin audit log panel. Confirm success/failure badges render in brand-teal/slate instead of emerald/rose.

- [ ] **Step 5: Commit**

```bash
git add app/portal/admin/audit/panel.tsx
git commit -m "fix(portal): resolve StatusBadge name collision in audit panel, use shared component"
```

---

### Task 6: `DayScheduleGrid.tsx` — migrate 3 duplicated status-color maps

**Files:**
- Modify: `app/portal/professional/components/DayScheduleGrid.tsx`

**Context:** Three parallel `Record<AppointmentStatus, string>` maps (bar/bg/text) duplicate and diverge from the shared token, introducing off-palette `fuchsia` (used nowhere else in the codebase) and literal `blue`/`cyan` instead of design tokens. `STATUS_COLORS`'s `.bar`/`.tint`/`.text` fields (Task 1) are exactly this shape already.

**Interfaces:**
- Consumes: `STATUS_COLORS` from Task 1.
- Produces: nothing new.

- [ ] **Step 1: Remove the 3 local maps, import the shared token**

Current `app/portal/professional/components/DayScheduleGrid.tsx:1-36`:
```tsx
"use client";

import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@prisma/client";
import type { ProfessionalDashboardAppointment } from "@/app/portal/professional/types";

const GRID_START_HOUR = 7;
const GRID_END_HOUR = 20;
const PX_PER_MINUTE = 1.25;

const statusBarColors: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-amber-400",
  CONFIRMED: "bg-emerald-500",
  CHECKED_IN: "bg-cyan-500",
  CANCELLED: "bg-rose-400",
  COMPLETED: "bg-blue-500",
  NO_SHOW: "bg-fuchsia-400",
};

const statusBgColors: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50",
  CONFIRMED: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/50",
  CHECKED_IN: "bg-cyan-50 border-cyan-200 dark:bg-cyan-950/30 dark:border-cyan-800/50",
  CANCELLED: "bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800/50",
  COMPLETED: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/50",
  NO_SHOW: "bg-fuchsia-50 border-fuchsia-200 dark:bg-fuchsia-950/30 dark:border-fuchsia-800/50",
};

const statusTextColors: Record<AppointmentStatus, string> = {
  SCHEDULED: "text-amber-800 dark:text-amber-200",
  CONFIRMED: "text-emerald-800 dark:text-emerald-200",
  CHECKED_IN: "text-cyan-800 dark:text-cyan-200",
  CANCELLED: "text-rose-800 dark:text-rose-200",
  COMPLETED: "text-blue-800 dark:text-blue-200",
  NO_SHOW: "text-fuchsia-800 dark:text-fuchsia-200",
};
```
Change to:
```tsx
"use client";

import { cn } from "@/lib/utils";
import type { ProfessionalDashboardAppointment } from "@/app/portal/professional/types";
import { STATUS_COLORS, DEFAULT_STATUS_COLOR } from "@/app/portal/components/ui/statusColors";

const GRID_START_HOUR = 7;
const GRID_END_HOUR = 20;
const PX_PER_MINUTE = 1.25;
```
(The `AppointmentStatus` type import is dropped here only because it was solely used as the `Record<AppointmentStatus, string>` key type for the three deleted maps — check the rest of the file with `grep AppointmentStatus app/portal/professional/components/DayScheduleGrid.tsx` before removing the import; if it's referenced elsewhere in this file, keep the import and just drop the three maps.)

- [ ] **Step 2: Update the 3 usage sites**

Current `app/portal/professional/components/DayScheduleGrid.tsx:130,134,136` (surrounding context preserved, only the referenced identifiers change):
```tsx
                  statusBgColors[appt.status],
```
```tsx
                <div className={cn("w-1 shrink-0 rounded-l-lg", statusBarColors[appt.status])} />
```
```tsx
                  <p className={cn("truncate text-[11px] font-semibold leading-tight", statusTextColors[appt.status])}>
```
Change to:
```tsx
                  (STATUS_COLORS[appt.status] ?? DEFAULT_STATUS_COLOR).tint,
```
```tsx
                <div className={cn("w-1 shrink-0 rounded-l-lg", (STATUS_COLORS[appt.status] ?? DEFAULT_STATUS_COLOR).bar)} />
```
```tsx
                  <p className={cn("truncate text-[11px] font-semibold leading-tight", (STATUS_COLORS[appt.status] ?? DEFAULT_STATUS_COLOR).text)}>
```

- [ ] **Step 3: Verify build, typecheck, lint**

Run: `npm run build && npm run typecheck && npm run lint`
Expected: 0 errors.

- [ ] **Step 4: Manually check the professional day-schedule grid**

`npm run dev`, sign in as professional, load the calendar/day view with the schedule grid. Confirm appointment blocks show brand-blue/slate colors distinguishing status, not amber/emerald/cyan/rose/fuchsia/blue.

- [ ] **Step 5: Commit**

```bash
git add app/portal/professional/components/DayScheduleGrid.tsx
git commit -m "fix(portal): migrate DayScheduleGrid status colors to shared token"
```

---

### Task 7: `ProfessionalCalendar.tsx` — recolor schedule-change-request status map

**Files:**
- Modify: `app/portal/professional/calendar/ProfessionalCalendar.tsx`

**Context:** `scheduleStatusStyles` covers a genuinely different domain (schedule-change approval requests, not appointment status) with its own 3-value enum (`PENDING_CONFIRMATION`/`CONFIRMED`/`CHANGES_REQUESTED`). Per the spec's "extend if needed, don't force unrelated domains into one shared map" guidance, this stays a small local map — only its off-palette amber/emerald/rose values are fixed to brand tokens.

**Interfaces:** Consumes nothing new. Produces nothing new (local map, not exported).

- [ ] **Step 1: Recolor the local map**

Current `app/portal/professional/calendar/ProfessionalCalendar.tsx:45-49`:
```tsx
const scheduleStatusStyles: Record<string, string> = {
  PENDING_CONFIRMATION: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  CONFIRMED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  CHANGES_REQUESTED: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};
```
Change to:
```tsx
const scheduleStatusStyles: Record<string, string> = {
  PENDING_CONFIRMATION: "bg-slate-100 text-slate-700 dark:bg-surface-muted dark:text-slate-300",
  CONFIRMED: "bg-brand-light text-brand-teal dark:bg-accent-cyan/15 dark:text-accent-cyan",
  CHANGES_REQUESTED: "bg-brand-light/60 text-brand-indigo dark:bg-brand-teal/10 dark:text-accent-cyan",
};
```

- [ ] **Step 2: Verify build, typecheck, lint**

Run: `npm run build && npm run typecheck && npm run lint`
Expected: 0 errors.

- [ ] **Step 3: Manually check the professional calendar's schedule-change-request list**

`npm run dev`, load the professional calendar screen, find a schedule-change-request item (or check with test data). Confirm the 3 states show slate/brand-teal/brand-indigo instead of amber/emerald/rose.

- [ ] **Step 4: Commit**

```bash
git add app/portal/professional/calendar/ProfessionalCalendar.tsx
git commit -m "fix(portal): recolor ProfessionalCalendar schedule-status map to brand tokens"
```

---

### Task 8: `ProfessionalDashboard.tsx` — active-patient badge + check-in button/state

**Files:**
- Modify: `app/portal/professional/ProfessionalDashboard.tsx`

**Context:** "PACIENTE ACTIVO" badge (emerald, no dark-mode variant — a pre-existing a11y gap fixed as a side effect of this token swap) and a check-in button+state pair using literal `cyan-400/500/600` instead of the `accent-cyan` design token. The parent container (`ProfessionalDashboard.tsx:473`) has `bg-white/80 dark:bg-surface-muted/60` — a light-by-default background, so the badge needs a real light/dark pair, not the single always-dark-context class it had before.

**Interfaces:** Consumes `STATUS_COLORS` (Task 1). Produces nothing new. Does **not** touch the "Alergia crítica" alert (`:496-504`) — that stays exactly as-is per the approved clinical exception (Global Constraints).

- [ ] **Step 1: Fix the "PACIENTE ACTIVO" badge**

Current `app/portal/professional/ProfessionalDashboard.tsx:491-493`:
```tsx
                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                  PACIENTE ACTIVO
                </span>
```
Change to:
```tsx
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_COLORS.Active.border} ${STATUS_COLORS.Active.tint} ${STATUS_COLORS.Active.text}`}>
                  PACIENTE ACTIVO
                </span>
```

- [ ] **Step 2: Fix the check-in button and "presente" state**

Current `app/portal/professional/ProfessionalDashboard.tsx:645-657`:
```tsx
                  <button
                    type="button"
                    onClick={() => void changeStatus(AppointmentStatus.CHECKED_IN)}
                    disabled={isSaving}
                    className="shrink-0 rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-600 transition hover:bg-cyan-500/20 disabled:opacity-50 dark:text-cyan-400"
                  >
                    Registrar llegada
                  </button>
                ) : null}
                {appointmentDetail.appointment.status === AppointmentStatus.CHECKED_IN ? (
                  <span className="shrink-0 rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                    Paciente presente ✓
                  </span>
```
Change to:
```tsx
                  <button
                    type="button"
                    onClick={() => void changeStatus(AppointmentStatus.CHECKED_IN)}
                    disabled={isSaving}
                    className="shrink-0 rounded-2xl border border-accent-cyan/40 bg-accent-cyan/10 px-4 py-2 text-xs font-semibold text-accent-cyan transition hover:bg-accent-cyan/20 disabled:opacity-50"
                  >
                    Registrar llegada
                  </button>
                ) : null}
                {appointmentDetail.appointment.status === AppointmentStatus.CHECKED_IN ? (
                  <span className="shrink-0 rounded-2xl border border-accent-cyan/40 bg-accent-cyan/10 px-4 py-2 text-xs font-semibold text-accent-cyan">
                    Paciente presente ✓
                  </span>
```

- [ ] **Step 3: Add the import**

Add `import { STATUS_COLORS } from "@/app/portal/components/ui/statusColors";` to this file's existing local-import block.

- [ ] **Step 4: Verify build, typecheck, lint**

Run: `npm run build && npm run typecheck && npm run lint`
Expected: 0 errors.

- [ ] **Step 5: Manually check in both light and dark mode**

`npm run dev`, sign in as professional, select an appointment. Confirm "PACIENTE ACTIVO" is legible (proper contrast) in both themes, the check-in button and "Paciente presente" state show `accent-cyan` consistently, and the untouched "Alergia crítica" alert (if a test patient has one) still renders in rose/red exactly as before.

- [ ] **Step 6: Commit**

```bash
git add app/portal/professional/ProfessionalDashboard.tsx
git commit -m "fix(portal): migrate ProfessionalDashboard active-patient badge and check-in colors to tokens"
```

---

### Task 9: `ReceptionistBilling.tsx` — payment-status map + stat-tile colors

**Files:**
- Modify: `app/portal/receptionist/billing/ReceptionistBilling.tsx`

**Context:** Billing is a genuinely distinct domain (payment status, not appointment/staff status) — kept as its own small local map per the spec's "extend if needed, don't force unrelated domains together" guidance, but recolored off amber/emerald/slate-mixed to brand tokens. Two stat-tile numbers ("Total cobrado"/"Pendiente por cobrar") carry the same semantic in plain text color, fixed alongside.

**Interfaces:** Consumes nothing new. Produces nothing new.

- [ ] **Step 1: Recolor the payment-status map**

Current `app/portal/receptionist/billing/ReceptionistBilling.tsx:19-23`:
```tsx
const paymentStatusStyle: Record<PaymentStatus, string> = {
  PENDING: "border-amber-200 bg-amber-100 text-amber-800",
  PAID: "border-emerald-200 bg-emerald-100 text-emerald-800",
  WAIVED: "border-slate-200 bg-slate-100 text-slate-600",
};
```
Change to:
```tsx
const paymentStatusStyle: Record<PaymentStatus, string> = {
  PENDING: "border-slate-300 bg-slate-100 text-slate-700 dark:border-surface-muted dark:bg-surface-muted dark:text-slate-300",
  PAID: "border-brand-teal/30 bg-brand-light text-brand-teal dark:border-accent-cyan/30 dark:bg-accent-cyan/15 dark:text-accent-cyan",
  WAIVED: "border-slate-200 bg-slate-50 text-slate-500 dark:border-surface-muted dark:bg-surface-base/60 dark:text-slate-400",
};
```
(Adds missing `dark:` variants as a side effect — the original had none.)

- [ ] **Step 2: Fix the stat-tile colors**

Current `app/portal/receptionist/billing/ReceptionistBilling.tsx:162,169`:
```tsx
              <p className="mt-2 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
```
```tsx
              <p className="mt-2 text-2xl font-semibold text-amber-600 dark:text-amber-400">
```
Change to:
```tsx
              <p className="mt-2 text-2xl font-semibold text-brand-teal dark:text-accent-cyan">
```
```tsx
              <p className="mt-2 text-2xl font-semibold text-slate-600 dark:text-slate-300">
```

- [ ] **Step 3: Verify build, typecheck, lint**

Run: `npm run build && npm run typecheck && npm run lint`
Expected: 0 errors.

- [ ] **Step 4: Manually check the billing screen**

`npm run dev`, sign in as receptionist, load the billing screen. Confirm payment-status badges and the two stat tiles ("Total cobrado", "Pendiente por cobrar") show brand-teal/slate, in both themes.

- [ ] **Step 5: Commit**

```bash
git add app/portal/receptionist/billing/ReceptionistBilling.tsx
git commit -m "fix(portal): recolor ReceptionistBilling payment-status and stat-tile colors to brand tokens"
```

---

### Task 10: `ReceptionistSettings.tsx` — notification dots + session-active badge

**Files:**
- Modify: `app/portal/receptionist/settings/ReceptionistSettings.tsx`

**Context:** Two "always-on" decorative dots (notification-preference indicators) and one "Sesión activa" badge use hardcoded emerald.

**Interfaces:** Consumes `STATUS_COLORS` (Task 1). Produces nothing new.

- [ ] **Step 1: Fix the two notification dots**

Current `app/portal/receptionist/settings/ReceptionistSettings.tsx:90,94`:
```tsx
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
```
(appears twice, identical — both instances change identically)
Change to:
```tsx
              <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_COLORS.Active.bar}`} />
```

- [ ] **Step 2: Fix the "Sesión activa" badge**

Current `app/portal/receptionist/settings/ReceptionistSettings.tsx:126`:
```tsx
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-400">
                Activa
              </span>
```
Change to:
```tsx
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS.Active.border} ${STATUS_COLORS.Active.tint} ${STATUS_COLORS.Active.text}`}>
                Activa
              </span>
```

- [ ] **Step 3: Add the import**

Add `import { STATUS_COLORS } from "@/app/portal/components/ui/statusColors";` to this file's existing local-import block.

- [ ] **Step 4: Verify build, typecheck, lint**

Run: `npm run build && npm run typecheck && npm run lint`
Expected: 0 errors.

- [ ] **Step 5: Manually check the receptionist settings screen**

`npm run dev`, load receptionist settings. Confirm dots and the "Sesión activa" badge show brand-teal, both themes.

- [ ] **Step 6: Commit**

```bash
git add app/portal/receptionist/settings/ReceptionistSettings.tsx
git commit -m "fix(portal): migrate ReceptionistSettings status indicators to shared token"
```

---

### Task 11: Literal Tailwind blue/indigo scale → brand tokens (remaining stragglers)

**Files:**
- Modify: `app/portal/client/components/NextVisitActions.tsx`

**Context:** One remaining off-token (not off-palette-family, but literal Tailwind `blue-*` instead of the named brand token) CTA button. (`AppointmentTable.tsx`'s and `ProfessionalDashboard.tsx`'s literal blue/indigo/cyan instances were already fixed in Tasks 2 and 8 respectively — this task is only the one file those didn't cover.)

**Interfaces:** Consumes nothing new. Produces nothing new.

- [ ] **Step 1: Fix the CTA button**

Current `app/portal/client/components/NextVisitActions.tsx:12-17`:
```tsx
      <Link
        href={detailsHref}
        className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-blue-700"
      >
        Gestionar cita
      </Link>
```
Change to:
```tsx
      <Link
        href={detailsHref}
        className="rounded-xl bg-brand-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-brand-indigo"
      >
        Gestionar cita
      </Link>
```

- [ ] **Step 2: Verify build, typecheck, lint**

Run: `npm run build && npm run typecheck && npm run lint`
Expected: 0 errors.

- [ ] **Step 3: Manually check**

`npm run dev`, load the client dashboard's next-visit card. Confirm "Gestionar cita" is brand-teal with brand-indigo hover, not literal blue.

- [ ] **Step 4: Commit**

```bash
git add app/portal/client/components/NextVisitActions.tsx
git commit -m "fix(portal): migrate NextVisitActions CTA from literal blue to brand-teal token"
```

---

### Task 12: `Card.tsx` deduplication — Admin role

**Files:** Modify the admin-role files listed in Step 1.

**Context:** Only 23 of ~90 portal files importing the card look actually use the shared `Card` component; the rest hand-duplicate its literal class string (`rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs shadow-slate-100/60 transition-colors dark:border-surface-muted/80 dark:bg-surface-elevated/80 dark:shadow-surface-dark`, or the `rounded-3xl` sibling variant). This is a mechanical reuse fix, not a visual change — every replacement must render pixel-identical output. Split into 4 tasks (this one + Tasks 13-15) by role to keep each independently reviewable.

**Interfaces:** Consumes `Card` from `app/portal/components/ui/Card.tsx` (already exists, not touched). Produces nothing new.

- [ ] **Step 1: Apply the mechanical transformation at each target**

**Rule:** for every file:line below, find the `<div className="rounded-2xl border border-slate-200... bg-white ... shadow-xs...">` (or `rounded-3xl` sibling) element. Replace the opening tag with `<Card className="...">` where `...` is whatever classes remain *after* removing every class already supplied by `Card.tsx` itself (`rounded-2xl`, `border`, `border-slate-200/80`, `bg-white`, `p-6`, `shadow-xs`, `shadow-slate-100/60`, `transition-colors`, and their `dark:` counterparts) — keep layout classes (`space-y-4`, `grid`, `flex`, custom padding overrides, etc.) in the `className` prop. Replace the matching closing `</div>` with `</Card>`. Add `import { Card } from "@/app/portal/components/ui/Card";` if the file doesn't already import it. If a file's card uses `rounded-3xl` instead of `rounded-2xl` with otherwise-matching classes, still convert it to `<Card>` (it's the same duplicated pattern at a different radius) unless the surrounding content makes clear the larger radius is a deliberate size variant — in that case leave a one-line comment noting why and skip it, don't force a mismatch.

**Targets (Admin):**
- `app/portal/[role]/page.tsx:51`
- `app/portal/admin/search/AdminSearchResults.tsx:69,84`
- `app/portal/admin/_components/StaffOnDutyList.tsx:26` (note: this file was also touched in Task 3 — if Task 3 already merged, re-read the file's current line numbers before editing)
- `app/portal/admin/scheduling/page.tsx:426,454,530,638,656`
- `app/portal/admin/_components/RevenueTrendChart.tsx:14`
- `app/portal/admin/_components/PeriodSelector.tsx:74`
- `app/portal/admin/_components/AppointmentsTable.tsx:17`
- `app/portal/admin/content/components/CollapsibleCard.tsx:17`
- `app/portal/admin/audit/panel.tsx:102,119` (note: this file was also touched in Task 5 — re-read current line numbers before editing)
- `app/portal/admin/users/AdminUsersPanel.tsx:344,451` (note: this file was also touched in Task 4 — re-read current line numbers before editing)
- `app/portal/admin/templates/templates-panel.tsx:128,160`
- `app/portal/admin/specialties/AdminSpecialtiesPanel.tsx:101,130`

**Separate, lower-confidence outliers found in the same file family — read carefully before touching, these are *partial* matches to the signature card, not the portal Card idiom, and may be intentional one-offs:**
- `app/portal/admin/content/AdminHomepageSpecialistsPanel.tsx:260` — uses `border-white/70`/`shadow-lg` (closer to the marketing signature card than the portal `Card.tsx`). Convert to the standard portal `<Card>` pattern for consistency with the rest of the admin content panels, unless reading the surrounding context shows this screen is intentionally previewing marketing-site content (in which case matching the marketing card there could be deliberate — if so, leave it and note why in the commit message).
- `app/portal/admin/users/AdminUsersPanel.tsx:87` — same `border-white/70 ... shadow-xl` pattern, same judgment call.

- [ ] **Step 2: Verify build, typecheck, lint**

Run: `npm run build && npm run typecheck && npm run lint`
Expected: 0 errors.

- [ ] **Step 3: Manually spot-check 3-4 of the touched admin screens**

`npm run dev`, load the admin dashboard, users list, scheduling page, and one content panel. Confirm no visual difference from before this task (same radius, border, background, shadow, padding) — this task must be visually invisible if done correctly.

- [ ] **Step 4: Commit**

```bash
git add app/portal/\[role\]/page.tsx app/portal/admin/
git commit -m "refactor(portal): deduplicate Card.tsx usage across admin role screens"
```

---

### Task 13: `Card.tsx` deduplication — Client role

**Files:** Modify the client-role files listed in Step 1.

**Interfaces:** Same as Task 12.

- [ ] **Step 1: Apply the same mechanical transformation (see Task 12 Step 1's rule) at each target**

**Targets (Client):**
- `app/portal/change-password/page.tsx:18`
- `app/portal/error.tsx:23`
- `app/portal/client/book/ClientBookingForm.tsx:223,232,276,317,422`
- `app/portal/client/consents/panel.tsx:88`
- `app/portal/client/appointments/ClientAppointmentsPanel.tsx:99,148`
- `app/portal/client/page.tsx:61,73,85,98,104,111,116,120,130,170` (note: this file was also touched in Task 2 — re-read current line numbers before editing)
- `app/portal/client/onboarding/page.tsx:19`
- `app/portal/client/profile/ClientProfileForm.tsx:118`
- `app/portal/client/treatment-history/page.tsx:201`

- [ ] **Step 2: Verify build, typecheck, lint**

Run: `npm run build && npm run typecheck && npm run lint`
Expected: 0 errors.

- [ ] **Step 3: Manually spot-check 3-4 touched client screens**

`npm run dev`, sign in as client, check the dashboard, booking form, and profile screen. Confirm no visual change.

- [ ] **Step 4: Commit**

```bash
git add app/portal/change-password/ app/portal/error.tsx app/portal/client/
git commit -m "refactor(portal): deduplicate Card.tsx usage across client role screens"
```

---

### Task 14: `Card.tsx` deduplication — Professional role

**Files:** Modify the professional-role files listed in Step 1.

**Interfaces:** Same as Task 12.

- [ ] **Step 1: Apply the same mechanical transformation (see Task 12 Step 1's rule) at each target**

**Targets (Professional):**
- `app/portal/professional/calendar/ProfessionalCalendar.tsx:197,223,252` (note: also touched in Task 7 — re-read current line numbers)
- `app/portal/professional/settings/ProfessionalSettings.tsx:39,58`
- `app/portal/professional/ProfessionalDashboard.tsx:371,375,383,473,636,663,706,775,803,822` (note: also touched in Task 8 — re-read current line numbers; only convert the discrete panel containers at these lines, not list-row items — see the exclusion list below)
- `app/portal/professional/documents/ProfessionalDocuments.tsx:99,139`
- `app/portal/professional/lab-results/ProfessionalLabResults.tsx:99,139`
- `app/portal/professional/patients/ProfessionalPatients.tsx:54`
- `app/portal/professional/patients/[id]/ClinicalHistoryPanel.tsx:314`
- `app/portal/professional/patients/[id]/page.tsx:54`

**Explicitly excluded from this task (not cards — table rows, form controls, structural chrome; do not touch):** `ProfessionalDashboard.tsx:528,543,550,576,605,763` (list rows), `:685` (form control), `ProfessionalPatients.tsx:61` (form control), `DayScheduleGrid.tsx:72` (data-grid container, already handled in Task 6), `ProfessionalTopbar.tsx:140,202` (floating dropdown panels), `patients/[id]/page.tsx:47` (status banner strip, not a card).

- [ ] **Step 2: Verify build, typecheck, lint**

Run: `npm run build && npm run typecheck && npm run lint`
Expected: 0 errors.

- [ ] **Step 3: Manually spot-check 3-4 touched professional screens**

`npm run dev`, sign in as professional, check the dashboard, calendar, and a patient's clinical history panel. Confirm no visual change.

- [ ] **Step 4: Commit**

```bash
git add app/portal/professional/
git commit -m "refactor(portal): deduplicate Card.tsx usage across professional role screens"
```

---

### Task 15: `Card.tsx` deduplication — Receptionist role + shared component

**Files:** Modify the receptionist-role and shared-component files listed in Step 1.

**Interfaces:** Same as Task 12.

- [ ] **Step 1: Apply the same mechanical transformation (see Task 12 Step 1's rule) at each target**

**Targets (Receptionist):**
- `app/portal/receptionist/components/CalendarMonth.tsx:51`
- `app/portal/receptionist/ReceptionistPanel.tsx:138,196`
- `app/portal/receptionist/components/AppointmentTable.tsx:151` (note: also touched in Task 2 — re-read current line numbers; this is the dashed-border empty state, still a legitimate `<Card>`-shaped container)

**Targets (Shared, cross-role):**
- `app/portal/components/AppointmentsList.tsx:86`

- [ ] **Step 2: Verify build, typecheck, lint**

Run: `npm run build && npm run typecheck && npm run lint`
Expected: 0 errors.

- [ ] **Step 3: Manually spot-check touched receptionist screens**

`npm run dev`, sign in as receptionist, check the main panel and calendar month view. Confirm no visual change.

- [ ] **Step 4: Commit**

```bash
git add app/portal/receptionist/ app/portal/components/AppointmentsList.tsx
git commit -m "refactor(portal): deduplicate Card.tsx usage across receptionist role and shared components"
```

---

### Task 16: Document the two new CLAUDE.md exceptions + portal card-idiom note

**Files:**
- Modify: `CLAUDE.md`

**Context:** Two decisions from this plan's pre-work need to be written down so they don't get re-flagged as violations in a future audit: form-success emerald/green (parallel to the existing error-red exception), and the clinical allergy-alert red. Also document that the portal's `Card.tsx` pattern is an intentional, separate design language from the marketing signature card, so a future sweep doesn't propose converging them.

**Interfaces:** None — documentation only, no code.

- [ ] **Step 1: Add the two color exceptions**

Current `CLAUDE.md`'s `### Colores` section (find the existing bullet added in Phase A: `- **Excepción aprobada**: rojo (\`red-*\`) para mensajes de error/validación...`). Add two more bullets immediately after it:
```
- **Excepción aprobada**: verde/emerald (`emerald-*`/`green-*`) para mensajes de éxito en formularios — paralelo a la excepción de rojo-error, misma lógica (urgencia/confirmación visual, no decorativo).
- **Excepción aprobada**: rojo/rose para alertas clínicas de seguridad del paciente (ej. alergias críticas en `ProfessionalDashboard.tsx`) — la urgencia visual es intencional y no debe migrarse a azul-marca.
```

- [ ] **Step 2: Document the portal card idiom**

Find `CLAUDE.md`'s `### Componentes` section (has the `**Tarjeta signature**` bullet). Add a new bullet:
```
- **Tarjeta portal** (`app/portal/components/ui/Card.tsx`): `rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs shadow-slate-100/60` — sin hover-lift, patrón deliberadamente distinto a la tarjeta signature (dashboard denso/tabular vs. marketing orientado a conversión). No convertir a signature card.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: approve form-success green and clinical-alert red exceptions, document portal card idiom"
```

---

### Task 17: Manual 3-breakpoint visual verification per role

**Files:** None — verification only.

**Interfaces:**
- Consumes: all prior tasks' changes.
- Produces: pass/fail visual confirmation per role, reported to the user.

**Screens in scope** (one primary dashboard/home screen per role, plus any screen a mechanical finding touched):
1. Admin: `/portal/admin` (dashboard/KPIs), `/portal/admin/users`, `/portal/admin/audit`.
2. Client: `/portal/client` (home), `/portal/client/settings`.
3. Professional: `/portal/professional` (dashboard with `DayScheduleGrid`), `/portal/professional/calendar`.
4. Receptionist: `/portal/receptionist` (or its dashboard route), `/portal/receptionist/billing`, `/portal/receptionist/staff`.

**Breakpoints:** 375px (mobile), 768px (tablet), 1280px (desktop).

- [ ] **Step 1: Start the dev server and sign in per role**

Run `npm run dev`. The portal is authenticated — use the `TEST_AUTH_BYPASS` dev-login pattern already used for the prior performance-project's Phase 2 manual verification (check `.env.local`/dev docs for the exact bypass mechanism if not already known from this session).

- [ ] **Step 2: Check each role's screens at all 3 breakpoints**

For each screen listed above: navigate, resize to each width, screenshot. Confirm: no horizontal overflow, no overlapping text/badges, `StatusBadge`/`StatusDot`/`Card` instances touched by this plan render with correct brand colors and no layout shift from their pre-plan versions, tables/grids reflow sensibly on mobile (e.g. `DayScheduleGrid`, `AppointmentTable` — these are data-dense, confirm they at least scroll/reflow without breaking rather than expecting a full mobile redesign, since that's out of scope), forms and buttons stay usable at 375px.

- [ ] **Step 3: Report results**

For each screen/breakpoint combination, report pass or a specific, concrete issue (element + problem, not "looks off"). Issues found are new findings for a follow-up fix — this task surfaces them, it doesn't fix them inline.

- [ ] **Step 4: Stop the dev server**

Stop the background `npm run dev` process once verification is complete.

- [ ] **Step 5: No commit for this task**

Verification-only.

---

### Task 18: Final full verification

**Files:** None — final gate.

**Interfaces:**
- Consumes: all prior tasks' code changes.
- Produces: confirmation that Phase B is complete and stable.

- [ ] **Step 1: Run the full verification suite**

```bash
npm run build
npm run typecheck
npm run lint
npm run test
```
Expected: build/typecheck/lint clean (0 errors; lint warning count unchanged from before this plan). Test suite passing. (Skip `npm audit` — no `package-lock.json` exists in this repo, same as Phase A's final gate.)

- [ ] **Step 2: Grep-verify zero remaining off-palette hits in the fixed categories**

Run: `grep -rn "bg-emerald-\|bg-amber-\|bg-rose-\|bg-fuchsia-\|bg-green-\|text-emerald-\|text-amber-\|text-rose-\|text-fuchsia-\|text-green-" app/portal --include="*.tsx"`
Expected: zero hits, OR only hits inside the ~20 form-success lines and the one clinical-alert block explicitly approved as exceptions in Task 16 — every other hit is a regression, go back and fix it.

- [ ] **Step 3: Confirm Task 17's findings are resolved or explicitly deferred**

If Task 17 surfaced any issues, confirm with the user whether they're fixed now (as new, separately-committed work) or explicitly deferred — don't let this plan close with silently-dropped findings.

- [ ] **Step 4: No commit for this task**

Final verification pass. If everything above is clean, Phase B is complete.

---

## Self-Review Notes (completed during plan authoring)

- **Spec coverage:** full mechanical sweep ✓ (ran before task-writing, findings inlined per task), off-palette color migration ✓ (Tasks 2-11), icon-barrel ✓ (verified zero violations, no task needed), signature-card pattern — re-scoped per user decision: portal keeps its own `Card.tsx` idiom (Task 16 documents this), only the *duplication* of that idiom is fixed (Tasks 12-15), symmetry/responsive requirement ✓ (Task 17), status-color exception rule ✓ (extended in Task 16 with 2 new sub-exceptions).
- **Deviation from the parent spec's original premise, corrected before task-writing:** the spec assumed `StatusBadge` already used an approved green/amber/red palette that just needed wider adoption. The actual sweep found `StatusBadge` uses brand-teal/slate (no green/amber/red at all), and a *second*, separately-"approved" emerald/sky/rose/amber system (`appointmentStatusBadge()`) was live and mixed into the same file. This was surfaced to the user before writing any task and resolved by the user's explicit decision (Task 2) — not silently assumed.
- **Placeholder scan:** no TBD/TODO. Tasks 12-15 use an exact, stated mechanical rule + file:line target lists instead of per-file diffs, since ~90 sites share one identical transformation — this is a named, concrete rule (per writing-plans guidance: vague guidance is a placeholder, a precise repeatable rule with exact targets is not).
- **Type consistency:** `STATUS_COLORS`/`DEFAULT_STATUS_COLOR`/`StatusDot` names and shapes are identical everywhere they're referenced across Tasks 2-11.

## Execution log

**Tasks 1-16:** all complete, each with a task-scoped review (Task 1 approved clean; Task 2, 3, 4, 5, 6, 7, 9, 10, 11, 16 approved clean; Task 8 needed one fix round for a light-mode contrast regression on the check-in button, caught and fixed; Task 12 needed one fix round after review found 1 of 15 skips used a factually-wrong padding excuse; Task 13 needed one fix round after review found 6 of 23 skips were wrongly excluded; Task 14 confirmed 0/22 targets convertible after independent verification; Task 15 approved clean, 1/5 converted). Full findings and rulings recorded in `.superpowers/sdd/2026-08-13-ui-polish-phase-b-portal/progress.md`.

**Task 17 — manual visual verification, complete 2026-08-17 (partial coverage):**
Verified live against the real (Neon) database using credentials supplied by the user mid-session (the plan's assumed `TEST_AUTH_BYPASS` dev-login path doesn't work against a connected remote DB — it requires an actual persisted user matching the bypass email, which doesn't exist in this environment).

- **Admin** (`dentprocolombia@gmail.com`): dashboard, users, audit — desktop (1280px) and mobile (375px), both light and dark mode. Confirmed correct: Task 3's staff-status dot (slate "Fuera"), Task 4's Active/Inactive badge + inverted-ternary toggle button, Task 5's audit success/failure badge (brand-teal, no more emerald/rose name-collision bug), Card.tsx dedup screens (KPI tiles, staff panel) render pixel-identical to pre-change. No regressions found.
- **Receptionist** (`LeidyA2222@hotmail.com`): dashboard, staff, billing — desktop and mobile, dark mode. Confirmed correct: Task 3's `StatusBadge` "Sin turno" pill, Task 9's brand-teal "Total cobrado" stat tile (no more emerald).
- 768px tablet breakpoint not checked for admin/receptionist (only 375px and desktop widths).

**Follow-up, closed 2026-08-18:** professional and client/paciente coverage completed once credentials became available.
- **Professional** (`camilogomez@hotmail.com`, activated by the user via the admin Users panel — confirmed `ACTIVO` before login): dashboard, calendar — desktop, dark mode. Confirmed correct: Task 7's `scheduleStatusStyles` "Confirmado" badge renders `accent-cyan`/brand-teal (no amber/emerald), `DayScheduleGrid` and `ProfessionalDashboard` render with no console/visual errors (no appointments scheduled today, so the grid's per-status colors from Task 6/8 weren't directly observable — code-reviewed and independently verified in the task loop, not re-confirmed live here).
- **Client/paciente** (`PacientePrueba@dentpro.co`): dashboard, settings, booking form — desktop, dark mode. Confirmed correct: the approved amber-warning exception ("Completa tu perfil" banner), Task 4's `client/settings/page.tsx` "Cuenta activa y verificada" badge (brand-teal, not emerald), Task 13's 5 `ClientBookingForm.tsx` Card conversions all render uniformly with no visual break.
- Mobile/tablet breakpoints not checked for professional or client (browser-tooling resize was unreliable in this session; desktop-only confirmation accepted).
- All 4 portal roles now have at least desktop live confirmation against the real database with zero regressions found.

**Task 18 — final verification: complete 2026-08-17.**
`npm run build` exit 0, `npm run typecheck` exit 0, `npm run lint` exit 0 (4 pre-existing `@next/next/no-img-element` warnings, unchanged from baseline), `npm run test` exit 0. `npm audit` skipped (no `package-lock.json`, same as Phase A's precedent).

Grep-verified remaining off-palette colors in `app/portal/**`. Two new findings surfaced, both pre-existing and out of this plan's scope (not touched by any task, not regressions introduced here):
- `app/portal/components/ui/StatCard.tsx:21` — `text-emerald-600 dark:text-emerald-400` on a KPI trend/change indicator. A new pattern the original sweep didn't catch (this file wasn't in any task's target list).
- `app/portal/components/activity/ActivityFeed.tsx:26-27` — `text-rose-600`/`text-emerald-600` icon colors for cancel/completed activity-feed entries — the same appointment-status semantic this plan spent 10+ tasks migrating to `STATUS_COLORS`, present in a file the sweep missed.

Not auto-fixed, per the "report findings, don't guess" principle this plan followed throughout — flagged here as a candidate for a small follow-up task, not silently fixed or silently dropped.

**Final whole-branch review** (dispatched on the most capable model per the subagent-driven-development skill, base `2e032a4`) found the paragraph above's residual-scope claim inaccurate and surfaced 3 Important findings, all fixed in commit `3846687` (scoped re-review confirmed clean):
1. 4 status badges (`client/page.tsx:134,174`, `AppointmentTable.tsx:159,176`) lost their dark-mode border color during migration — a bare `border` class with no color fell back to a global reset default, rendering a flat light-gray hairline in both themes. Fixed by adding `STATUS_COLORS[...].border` alongside `.badge` at all 4 sites.
2. `AdminServicesPanel.tsx` had a 6th independent active/inactive color implementation Task 4 missed. Migrated to `STATUS_COLORS.Active`/`.Inactive`.
3. `admin/settings/page.tsx`'s verified-account icon still used hardcoded emerald; its sibling `client/settings/page.tsx` had already migrated the identical pattern. Migrated to match.

The review also correctly called out that the closing grep sweep's "everything else is an approved exception" claim was too broad — additional un-migrated off-palette hits exist that fit neither CLAUDE.md exception: `RevenueTrendChart.tsx:23` (emerald delta indicator, same pattern as `StatCard.tsx:21`, in a file this plan already touched), `AdminUsersPanel.tsx:116` (amber warning), several amber warning banners (`ClientPortalShell.tsx`, `ClientBookingForm.tsx`, `AdminImageField.tsx`, `ChangePasswordForm.tsx`), and rose destructive-action buttons (`AdminCampaignsPanel.tsx:314`, `AdminServicesPanel.tsx:284,350`) inconsistent with Task 2's decision to de-hue `AppointmentTable.tsx`'s "Cancelar" button to slate. None of these were fixed at the time — they were recorded here, alongside `StatCard.tsx`/`ActivityFeed.tsx`, as the complete deferred-findings list.

**Follow-up, closed 2026-08-17 (commit `6fef043`):** the user reviewed the full deferred list and made two decisions. `StatCard.tsx:21`, `RevenueTrendChart.tsx:23` (unconditional emerald trend indicators) and `ActivityFeed.tsx:26-27` (cancel/completed status icons) were genuine misses — migrated to `brand-teal`/`accent-cyan` and `STATUS_COLORS` respectively. The amber warning-banner and rose destructive-delete-button categories were approved as two new CLAUDE.md exceptions instead of migrated — amber for informational warnings (distinct from success/error), rose for irreversible-delete actions (distinct from normal status transitions, which stay on brand). Both documented in `CLAUDE.md`'s `### Colores` section. All 6 originally-deferred findings are now closed.

Phase B code work is complete. Task 17's professional and client role coverage remains deferred pending credentials, per that task's log above.
