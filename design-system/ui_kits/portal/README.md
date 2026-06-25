# DentPro Portal UI Kit

Recreation of the **multi-role clinical portal** from `app/portal/` in the [DentPro-Colombia](https://github.com/Alejorodr/DentPro-Colombia) Next.js codebase. Includes the shared `PortalShell` (sidebar + topbar + role-specific nav) and the four role landing pages.

## Files

| File | Role | Mirrors in repo |
|---|---|---|
| `index.html` | Mounts the full portal with a role-switcher in the topbar | `app/portal/layout.tsx` + `[role]/page.tsx` |
| `styles.css` | Portal-specific `pp-*` classes (sidebar, topbar, cards, tables, status pills) | parts of `app/globals.css` + per-role shells |
| `PortalShell.jsx` | Sidebar, topbar, role-aware navigation registry | `PortalShell.tsx` + `layout/Sidebar.tsx` + `layout/Topbar.tsx` |
| `AdminDashboard.jsx` | KPIs, period selector, revenue chart, staff on duty, appointments table | `app/portal/admin/page.tsx` + `_components/*` |
| `RoleViews.jsx` | Patient dashboard, professional agenda, receptionist queue | `app/portal/client/page.tsx`, `app/portal/professional/`, `app/portal/receptionist/dashboard/` |

## Role switcher

The topbar has a dropdown to swap between **Admin / Profesional / Paciente / Recepción**. The sidebar nav rebuilds from `NAV_BY_ROLE` so every role shows its real production navigation (Spanish labels for patient/professional, English for admin/receptionist — matching the codebase). Pages other than the landing dashboard show a "coming soon" placeholder rather than a half-baked recreation.

## What's faithful

- **Sidebar nav** — exact role nav from `PortalShell.tsx`, with the same Phosphor icons.
- **Topbar** — sticky frosted header with search, notifications, help, avatar pill, plus an admin-only global search input.
- **Admin dashboard** — 4 KPI cards (Appointments / Revenue / Active Staff / Pending), period pill selector (Today/Last 7/Last 30/MTD/YTD), revenue bar chart, staff-on-duty list, today's appointments table.
- **Patient dashboard** — header card with patient ID + clinic chips, next-visit gradient hero, quick actions, history feed, consent checklist.
- **Professional agenda** — day cronograma with colored status borders + KPI strip.
- **Receptionist dashboard** — in-room queue + call-list with click-to-call buttons.

## What's mocked

- Real data layer (Prisma queries) — values are static sample data.
- Charting — replaced with simple gradient bars instead of a Chart.js dep.
- Settings, Audit, CMS, Billing, Templates, Staff Mgmt, etc. — all show a "coming soon" placeholder. The page exists in production; we just haven't recreated it here.

## Running it

Open `ui_kits/portal/index.html` directly.

## Extending coverage

To recreate one of the "coming soon" pages, add a new `.jsx` file (e.g. `AdminPatients.jsx`) exporting a window-attached component, then route to it in `index.html`'s `PortalKit` resolver. Keep visual style consistent with the existing screens.
