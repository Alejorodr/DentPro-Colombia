# UI Polish vs. design-system/ — Design

## Context

Following the performance / Core Web Vitals work (2 phases, both shipped — see `2026-08-11-performance-core-web-vitals-design.md`), this covers the second of three deferred, visually-oriented workstreams the user identified: **UI polish against `design-system/`**. The third (a structural visual redesign) stays out of scope here — it's a separate, larger initiative with its own spec later.

This is an audit-and-correct project: bring existing marketing + portal UI into conformance with the brand rules already documented in `CLAUDE.md` and `design-system/README.md` / `design-system/SKILL.md`, not a redesign. No new layouts, no new components beyond what's needed to fix a violation (e.g. adopting the existing shared `StatusBadge` where a screen still hardcodes status colors).

## Recon findings (baseline, from initial exploration)

1. **Icon barrel violation — correction:** initial recon flagged `app/(dashboard)/components/SpecialistsShowcase.tsx` (imports `CaretLeft`/`CaretRight` directly from `@phosphor-icons/react`) as the one confirmed violation. A precisely-scoped re-sweep during Phase A planning found this file is **not** in `app/(marketing)/**` — it lives under a separate `app/(dashboard)/[role]/...` route group that no other file in the codebase imports (`grep -rl SpecialistsShowcase app/` returns nothing) and that isn't part of the architecture `CLAUDE.md` documents (`app/(marketing)/`, `app/portal/`). This looks like orphaned/legacy code predating `app/portal/`, not a marketing-site file. It is out of scope for this project (neither Phase A nor Phase B touch it) and is flagged to the user as a separate, standalone finding — possibly a candidate for deletion, but that's a decision for the user, not this project. The actual Phase A sweep found zero icon-barrel violations within true scope; two other, arguably worse violations of the same underlying rule (a raw inline `<svg>` and raw `★` text glyphs standing in for icons) were found instead — see the Phase A plan.
2. **Off-palette colors**: 32 files (`app/**/*.tsx`, excluding `design-system/`) use Tailwind color classes outside the brand's blue palette (`bg-green-*`, `bg-emerald-*`, `bg-amber-*`, `bg-purple-*`, etc.). Sampling shows most are status semantics (appointment status, staff availability, active/inactive toggles) rather than decorative misuse — e.g. `app/portal/admin/_components/StaffOnDutyList.tsx` hardcodes `available: "bg-emerald-500"` / `busy: "bg-amber-500"` instead of using the shared `StatusBadge` component (added in the June 2026 visual-modernization work, commit `f2e7981`, which already established an approved status-color palette but was not adopted everywhere).
3. **No visual-regression tooling**: no Playwright screenshot tests or other automated visual-diff infrastructure exists in the repo. Verification for this project is manual-browser-based, same as Phase 2 of the performance project.
4. **Portal scale**: `app/portal/**` has ~130 `.tsx`/`.ts` files across 4 role shells (`paciente` — routed as `client`, `profesional`, `recepcionista`, `administrador`). Too large to read every file individually within one plan; needs a heuristic sweep (grep-based) to locate concrete violations, same pattern used successfully in the performance Phase 2 portal audit.
5. **Prior work already covers part of this ground**: the June 2026 "modernización visual" plan (`docs/superpowers/plans/2026-06-18-modernizacion-visual-ux.md`) already fixed a broken Tailwind config reference, introduced `StatusBadge` with an approved palette + dark mode, and rolled it out across receptionist/professional/client/admin appointment tables and staff lists (commits `f2e7981` through `1b2dfeb`). This project is not starting from zero — it's closing the remaining gaps that work didn't reach (the 32 files above, most of which are components outside the specific tables that plan touched), plus covering ground that plan's scope explicitly excluded (marketing site — that plan was portal-only).

## New requirement from stakeholder review

The user added an explicit requirement during design review, beyond the token-level audit: **the site must be symmetric, organized, and responsive.** This is a layout/spacing/breakpoint concern, not a color/icon/typography-token concern, and it cannot be detected by grep — it requires a real visual pass in the browser at multiple viewport widths, comparing against `design-system/ui_kits/` as the reference for intended layout. This is folded into both phases below as a mandatory manual-check dimension, not a separate phase.

## Approach: two independent phases, hybrid audit method

Following the same "smaller, well-bounded units, each phase ships independently" principle used for the performance project.

**Audit method (both phases):**
1. **Mechanical sweep (grep-based):** locate concrete, objectively-detectable violations — off-palette Tailwind color classes, Phosphor icon imports bypassing the `Icon.tsx` barrel, and cards using rounded/shadow/border utility combinations that don't match the signature card pattern (`rounded-[1.75rem] border border-white/70 bg-white/90 p-6 shadow-xl shadow-slate-900/10 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300`).
2. **Manual visual pass:** for every page/screen touched by step 1's findings, load it in a browser at three widths — **375px** (mobile), **768px** (tablet), **1280px** (desktop) — and check: symmetry/alignment, consistent spacing rhythm, no layout breakage or overflow at any width, and visual match against the corresponding `design-system/ui_kits/marketing/` or `design-system/ui_kits/portal/` reference component.
3. Screens with zero mechanical findings still get a quick visual spot-check (not a full 3-breakpoint audit) since layout/symmetry issues can exist independently of token violations — this is where the new symmetry/responsive requirement adds coverage beyond a pure grep-driven approach.

**Status-color rule (both phases):** green/amber/red remain permitted, but *only* for status semantics (appointment status, availability, active/inactive), and only via the shared `StatusBadge` component (or an equally centralized token, if a screen's status indicator isn't a badge — e.g. a colored dot) — never a fresh hardcoded Tailwind color class. Everything else (backgrounds, buttons, decorative elements, borders) must be the brand blue palette or `slate-*` neutrals, per `CLAUDE.md`.

## Phase A — Marketing site

**Scope:** `app/(marketing)/**` and `app/page.tsx`.

- Fix the one confirmed icon-barrel violation (`SpecialistsShowcase.tsx`).
- Run the mechanical sweep for color/card-pattern violations across marketing components (recon above found 2 marketing-adjacent hits in the initial grep — `InfoBar.tsx` and the dashboard-adjacent `SpecialistsShowcase.tsx` area — full sweep happens at plan-execution time, not finalized here).
- Manual 3-breakpoint visual pass on every marketing page: homepage, service detail pages (`/servicios/[slug]`), any other public route under `(marketing)`.

Small surface area, high visibility (public-facing) — good first phase to validate the audit method before tackling the much larger portal.

## Phase B — Portal (4 roles)

**Scope:** `app/portal/**` (~130 files across `paciente`/`client`, `profesional`, `recepcionista`, `administrador`).

- Full mechanical sweep across all 4 role shells for the same violation classes as Phase A.
- Prioritize the 32 files already flagged in recon — migrate hardcoded status colors to `StatusBadge` (or extend `StatusBadge`/introduce an equally shared primitive if a genuinely new status-display shape is needed — e.g. a status dot rather than a badge pill; do not proliferate new one-off components for this).
- Manual 3-breakpoint visual pass per role's primary screens (dashboard/home for each role, plus any screen touched by a mechanical finding). Given the portal is authenticated, this reuses the `TEST_AUTH_BYPASS` dev-login pattern already used for performance Phase 2's manual verification.
- Report any file where a color/icon/card violation looks intentional or ambiguous (e.g. a genuinely new semantic color use, not just a missed migration) rather than silently "fixing" it — same "report findings, don't guess" principle the performance spec used for the portal audit.

## Verification

**Every phase:**
```
pnpm run build && pnpm run typecheck --pretty false && pnpm run lint && DATABASE_URL="file:./prisma/dev.db" pnpm run test
```

**Additionally, every phase:**
- Manual 3-breakpoint (375px / 768px / 1280px) browser check on every page/screen with a mechanical finding, per the Audit method above — visual symmetry, spacing consistency, no overflow/breakage, and comparison against `design-system/ui_kits/`.
- Quick visual spot-check (single breakpoint, desktop) on screens with zero mechanical findings, to catch symmetry/organization issues the grep sweep can't see.
- No automated visual-regression tooling exists, so this manual step is the real gate, not a formality — same caveat as performance Phase 2.

## Out of scope (explicitly, not forgotten)

- No routing or auth changes.
- No new features or new components beyond what's needed to fix a flagged violation (e.g. extending `StatusBadge`, not building new components speculatively).
- No structural/layout redesign — this is a conformance audit against existing brand rules and existing `design-system/ui_kits/` references, not a rethink of page structure. That's the third deferred workstream ("rediseño visual"), out of scope here.
- No performance work — already covered and closed in the prior project.
- No changes to `@/components/ui/Icon.tsx` itself, or to the brand tokens in `design-system/colors_and_type.css` — this project brings the app into conformance with existing tokens, it doesn't change the tokens.
