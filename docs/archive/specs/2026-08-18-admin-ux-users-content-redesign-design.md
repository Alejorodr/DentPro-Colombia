# Admin Portal UX Redesign: Users/Roles/Specialties + Content CMS — Design

## Context

Following the performance (2 phases) and UI-polish (Phases A + B) workstreams, this is the third and final deferred initiative the user identified back in the performance-project brainstorm: **"rediseño visual"** (structural visual redesign). Unlike the first two — which were audit-and-correct passes against an existing design system — this one has no prior scope definition anywhere in the repo; it was named but never specced.

Brainstorming with the user established that "visual redesign" isn't a whole-site restyle — it's two specific, badly-organized admin-portal subsystems the user (the clinic's actual admin) struggles to use day to day:

1. **Users / Roles / Specialties management** — creating and editing user accounts, changing a user's role, assigning a professional's specialty, and configuring which specific services that professional offers.
2. **Content (homepage CMS)** — editing what's shown on the public marketing homepage from the admin portal.

Both are **information-architecture and interaction-flow problems**, not brand/token problems — `CLAUDE.md` and `design-system/` remain the locked source of truth for color, typography, card patterns, and icon usage (per Phase A/B's own hard-won enforcement). This redesign works entirely within those existing tokens.

## Current-state findings (root-cause diagnosis)

### Users / Roles / Specialties: four pages, two unreachable, real IA collision

Investigation of `app/portal/admin/**` and `app/portal/components/PortalShell.tsx`'s admin nav config found:

- **`/portal/admin/users`** (`AdminUsersPanel.tsx`) — the real, unfiltered user list (all 4 roles), with create-user form, role dropdown + "Guardar rol" button, activate/deactivate, reset password, delete. **Has no sidebar nav link.** Reachable only by typing the URL directly.
- **`/portal/admin/staff`** (nav label "Gestión de personal", the only linked entry point) — renders `AdminProfessionalsPanel`, which is literally `<AdminUsersPanel roleFilter="PROFESIONAL" roleLock="PROFESIONAL" />`. The admin's only discoverable "user list" is silently filtered to professionals only, with no visible indication it's filtered — this is the direct cause of "no aparecen todos los usuarios en la lista."
- **`/portal/admin/specialties`** (`AdminSpecialtiesPanel.tsx`) — real CRUD for specialty categories (name + default slot duration). **Has no sidebar nav link**, and no cross-link from anywhere a professional's specialty is assigned.
- **`/portal/admin/professionals`** — a thin wrapper, effectively the same component as `/staff`.

A professional's specialty is assigned via a dropdown inside `AdminUsersPanel`'s per-row role editor, but that dropdown only lists *already-existing* specialties — if the one needed doesn't exist yet, there's no visible path from that dropdown to specialty creation.

**Root cause of every symptom the user named:** two of the four pages are unlinked, and the one linked page is filtered without saying so. This is a navigation/discoverability failure first, an interaction-design failure second.

**Data model correction (found during spec review with the user):** `ProfessionalProfile.specialtyId` is a single required field in `prisma/schema.prisma` — **one professional has exactly one specialty**, not several. The specialty itself carries no price or duration (`Specialty` = `name`, `defaultSlotDurationMinutes`, `active` only). Cost and duration live one level down, on `Service` (already has its own linked admin page, "Servicios y tarifas" → `AdminServicesPanel`), which belongs to a `Specialty`. A third model, **`ProfessionalService`** (professional ↔ specific service, with `active`, `onlineBookable`, and optional per-pair duration/buffer overrides), is the piece that actually answers "which professionals offer this service, and how" — it has a working API (`/api/admin/scheduling`, `GET`/`POST`/`PATCH` already handle `prisma.professionalService`) but **no admin UI anywhere** references it; it's currently only populated by `prisma/seed.ts`. This is a real, previously-undocumented functional gap, not just a discoverability one — folded into the redesign below.

### Content: one 12-section scrolling page, incomplete relative to the real homepage

`app/portal/admin/content/page.tsx` renders 12 panel components in a single vertical scroll, with only a pill-row of anchor links (`<a href="#hero-stats">` etc.) as navigation — no persistent structure, no per-section framing beyond a one-line description repeated inline.

Cross-referencing the actual homepage composition (`app/page.tsx`) against the 12 Content sections found **three real homepage components with no editable Content section at all**:
- **Navbar** — nav links (`NAV_LINKS`) are a hardcoded constant in `app/page.tsx`, not sourced from content data at all.
- **InfoBar** — the top strip (location, schedule, Google rating) — no dedicated Content panel.
- **FloatingActions** — the floating WhatsApp/call/booking buttons — no dedicated Content panel.

This matches the user's complaint precisely: "no solo no están todos los elementos de inicio en content sino que además es confuso cómo editarlo."

## Approach

Two independent sub-projects sharing one spec and one implementation plan (per explicit user request — "quiero un plan multiagente para ambos rediseños"), executed the same way Phase A/B were: `superpowers:subagent-driven-development`, fresh implementer per task, task-scoped review, final whole-branch review.

### Sub-project 1 — Users / Roles / Specialties

**Navigation fix (prerequisite, unblocks everything else):**
- Add "Usuarios" (→ `/portal/admin/users`, unfiltered) and "Especialidades" (→ `/portal/admin/specialties`) to the admin sidebar nav (`PortalShell.tsx`'s `ADMINISTRADOR` nav array).
- Keep "Gestión de personal" (→ `/portal/admin/staff`) as a professionals-only quick view, but make the filter visible (e.g. a page subtitle: "Mostrando solo profesionales — ") and add a cross-link to the full Usuarios page.

**Role-change flow redesign:**
- Replace the inline role `<select>` + "Guardar rol" button + separate specialty `<select>` (three disconnected controls per row) with a single **"Cambiar rol" button per user row** that opens a modal with up to 3 sections, revealed progressively:
  1. **Rol** — shows current role as a `StatusBadge`-style pill, then a role selector (Cliente / Profesional / Recepcionista / Administrador).
  2. **Especialidad** — appears only when the selected role is Profesional. **Single-select** (schema constraint: `ProfessionalProfile.specialtyId` is one required field, not a list), sourced live from `/api/specialties`, pre-populated with the professional's current specialty if already assigned. An inline **"+ Crear especialidad"** affordance (a small add-row, not a page navigation) lets the admin create a missing specialty without leaving the modal — POSTs to the same endpoint `AdminSpecialtiesPanel.tsx` already uses, then selects the new specialty.
  3. **Servicios que ofrece** — appears once a specialty is selected (new or existing). Lists the `Service` rows belonging to that specialty (name, price, duration — read from the existing `/api/services` or equivalent used by `AdminServicesPanel.tsx`), each with a toggle for `active`/`onlineBookable`, backed by the already-working `professionalService` `GET`/`POST`/`PATCH` handlers in `/api/admin/scheduling`. This is the piece that closes the real gap found during spec review: today there is no admin UI to control which specific services a professional actually offers — only seed data populates it.
  - Confirm/save on each section shows loading → success/error state explicitly (per the ui-ux-pro-max "Submit Feedback" and "Confirmation Dialogs" guidelines — these are significant, semi-irreversible actions; no silent inline swap).
- The same modal (opened via the same "Cambiar rol" button, or relabeled "Gestionar profesional" when the user is already Profesional) is the **one place** specialty and service assignment happen for an existing professional — no separate flow.
- Activate/deactivate, reset password, and delete stay as their own row-level actions (unchanged) — this redesign is scoped to role + specialty + service assignment, not the whole row's action set.

### Sub-project 2 — Content (homepage CMS)

**Layout:** two-pane — persistent left sidebar (grouped: Marca/Header, Hero, Servicios, Equipo, Agenda, FAQ, Contacto/Footer, Redes, Marketing) + a single-section panel on the right, replacing the current single 12-section vertical scroll. A breadcrumb (`Contenido > <sección>`) sits above the active panel. Each sidebar item shows a one-line "qué es / dónde aparece en la home" description, visible before the admin clicks in (as a subtitle under the item label, not a tooltip — discoverable without hover).

**New sections** (closing the homepage-vs-Content gap found above):
- **Navbar** — edit `NAV_LINKS` (currently hardcoded) as real content data: label + href pairs, add/remove/reorder.
- **Barra superior (InfoBar)** — location text, schedule text (these may already be covered by the existing Settings/Locations panels; the implementing task must check for genuine overlap before adding a new panel, and either point to the existing panel or add the missing fields to it, rather than creating a duplicate editable source for the same data).
- **Botones flotantes (FloatingActions)** — the floating action buttons' target links/labels.

Existing 12 panels keep their current implementation (`AdminHomepageSettingsPanel.tsx` etc.) — this is a **navigation and layout restructuring**, not a rewrite of each panel's internal form logic, except where a panel's own internal organization is later found to have real overlap/duplication with the new sections (per the note above).

### Quality bar (applies to all new/changed interactive UI in both sub-projects)

Distilled from `/hallmark`'s cross-cutting disciplines (its page-macrostructure/theme-catalog machinery does not apply — this is internal CRUD UI on an already-locked design system, not a marketing page) and `/ui-ux-pro-max`'s UX-guideline domain:

- Every new interactive element (modal, button, select, toggle) ships explicit states: default, hover, focus-visible (visible ring, ≥3:1 contrast, appears instantly — never animated in), active, disabled, loading, error, success.
- Confirm before destructive/significant actions (role change, specialty reassignment, delete) — no silent inline mutation.
- Explicit submit feedback: loading → success or error, never silent.
- Inline form validation on blur, not submit-only.
- No horizontal scroll; verified at 375px, 768px, 1280px (this project's established breakpoints from Phase A/B).
- Content jumping avoided — reserve space for async-loaded lists (specialty options, user list) rather than layout-shifting on load.
- Long content (specialty tag lists, user names/emails) truncates gracefully with an expand affordance, not raw overflow.
- z-index scale discipline for the new modal (reuse the existing modal z-index token/pattern already established in the codebase — e.g. `AdminServicesPanel.tsx`'s delete-confirm modal — don't invent a new one).
- All colors/spacing/typography come from existing tokens (`brand-teal`, `brand-indigo`, `Card.tsx`, `StatusBadge`/`STATUS_COLORS`, the 4pt Tailwind spacing scale already in use) — no new palette, no new font.

## Out of scope

- No changes to the *content* of the 12 existing Content panels' own internal forms (field lists, validation rules) beyond what's needed to close the 3 missing-section gap and any genuine overlap found during implementation.
- No changes to the row-level actions already working correctly in Users (activate/deactivate, reset password, delete) beyond the role/specialty/service consolidation described above.
- No changes to `TimeSlot`/`AvailabilityRule` scheduling logic, or to the existing `/api/admin/scheduling` endpoints themselves — only a new UI surface consuming the `professionalService` portion of that already-working API.
- No auth/permission model changes — this is UI/flow only.
- No changes to `AdminProfessionalsPanel`'s underlying filter mechanism (`roleFilter`/`roleLock` props) — only to whether that filtering is visibly disclosed and cross-linked.
- No new brand colors, fonts, or tokens — reuses everything Phase A/B already established.
- The marketing site, and the other 3 portal roles (client/professional/receptionist), are untouched — admin-only.

## Verification

Same gate as Phase A/B:
```
npm run build && npm run typecheck && npm run lint && npm run test
```
Plus a manual pass (live, against the real dev DB, admin role) at 375px/768px/1280px, both light and dark mode, covering: the new "Cambiar rol" modal (all 4 role transitions, specialty selection + inline specialty creation, service-offering toggles), the 2 new nav links, and the restructured Content sidebar+panel (including the 3 new sections).
