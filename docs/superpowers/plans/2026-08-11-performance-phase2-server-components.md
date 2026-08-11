# Performance Phase 2: Client → Server Component Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert marketing and admin-portal components that don't actually need client-side interactivity from `"use client"` to server components, reducing client JS shipped to the browser without changing any rendered output or behavior.

**Architecture:** Each task removes a `"use client"` directive from one or more files that were verified (by reading the full file and its transitive imports) to have zero hooks, zero browser-API usage, and zero event handlers. No component logic changes — these are boundary-only conversions. One task (Task 1) is a prerequisite fix for a real React Server Components gotcha discovered during recon: a file that only *re-exports references* to client components still needs `"use client"` removed if something calls one of its plain functions from server code.

**Tech Stack:** Next.js 16 App Router, React Server Components, TypeScript, `@phosphor-icons/react` (via `@/components/ui/Icon.tsx`).

## Global Constraints

- No visual or behavioral change — every converted component must render pixel-identical output and preserve all existing interactivity in components that stay client.
- `@/components/ui/Icon.tsx` (the mandated icon barrel per `CLAUDE.md`) **must stay `"use client"`** — `@phosphor-icons/react`'s icon components call `useContext` internally (for the shared `IconContext` default-props mechanism), so they require a client boundary. Do not attempt to convert this file.
- Per the parent design spec (`docs/superpowers/specs/2026-08-11-performance-core-web-vitals-design.md`), the portal is audited, not blanket-converted: "portal dashboards are inherently interactive... real candidates are expected to be few or none. Report findings before converting anything there." Only portal files individually verified to have zero interactivity signals are converted in this plan; everything else stays client and is documented as correctly staying client.
- Every task must build clean (`pnpm run build`) and pass `pnpm run typecheck --pretty false` before being considered done — a broken RSC client/server boundary shows up as a build-time or runtime error, not a type error, so the build step is the real gate here, not typecheck.
- Per the spec's Phase 2 verification requirement: **manually load every converted page/component in a browser via the dev server and confirm it renders and behaves identically before considering that component's conversion done.** Automated tests do not reliably catch RSC hydration mismatches — this must be a real manual check, not skipped.

## Deviation from the parent spec (read before starting)

The parent spec (written before Phase 1 shipped) named three marketing conversion candidates: `InfoBar`, `Hero`, `CampaignCarousel`. Recon for this plan found:

- **`Hero.tsx`** has no `"use client"` directive — it is **already a server component**. It renders `HeroGoogleReviewRotator` (a genuinely client component, uses `useState`/`useEffect`/`window.setInterval` for review rotation) as a JSX child, which is the correct, already-in-place server-parent/client-child pattern. **No task needed.**
- **`CampaignCarousel.tsx`** is also **already a server component** — an `async function` that queries Prisma directly and has no `"use client"`. The spec's own text already flagged this ("CampaignCarousel already does its data fetch server-side"). **No task needed.**
- **`InfoBar.tsx`** is the only one of the three that is genuinely still `"use client"` with no hooks — this is the real conversion target (Task 2).

Task 4 (the portal audit) documents this finding plus the portal sweep results — it's the plan's "report findings" deliverable from the spec, expanded to also record why Hero/CampaignCarousel needed no work.

---

### Task 1: Remove unnecessary `"use client"` from `icon-registry.tsx`

**Why this is a prerequisite, not optional cleanup:** `InfoBar.tsx` (Task 2) calls `resolveMarketingIcon(name)` — a **plain function call**, not JSX — to resolve an icon name to a component reference before rendering it. `resolveMarketingIcon` is exported from `app/(marketing)/components/icon-registry.tsx`, which currently has `"use client"` at the top. When a Server Component imports and *calls* (not renders as JSX) a function from a `"use client"`-marked file, Next.js's RSC compiler treats every export of that file as a client reference — and calling a client reference as a plain function throws at runtime: `Error: Attempted to call resolveMarketingIcon() from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.` Converting `InfoBar.tsx` without this fix first will build successfully but crash at request time on the homepage.

This fix is safe because `icon-registry.tsx` itself contains no hooks and no browser APIs — it only builds a `Record<MarketingIconName, Icon>` lookup table from icon components imported from `@/components/ui/Icon` (which stays `"use client"`, per Global Constraints) and returns references from it. Returning a reference to a client component from a non-client file, then rendering that reference as JSX later, is the standard supported server→client composition pattern — the only unsupported thing was calling the *lookup function itself* as a plain server-side call while the lookup file was marked client.

**Verified safe for all 5 current consumers** (confirmed via `grep -rl` across `app/(marketing)/`): `Services.tsx`, `BookingForm.tsx`, `FloatingActions.tsx`, `ContactSection.tsx` are already `"use client"` themselves (removing `"use client"` from a file they import doesn't change how they work — a non-client file works identically when imported from a client file). `InfoBar.tsx` is the 5th consumer and is converted in Task 2.

**Files:**
- Modify: `app/(marketing)/components/icon-registry.tsx:1-2`

**Interfaces:**
- Consumes: nothing new.
- Produces: `resolveMarketingIcon(name: MarketingIconName): Icon` remains identically callable from both server and client code after this change — its signature and behavior are unchanged, only its module's client-boundary status changes.

- [ ] **Step 1: Remove the `"use client"` directive**

Current `app/(marketing)/components/icon-registry.tsx:1-4`:
```typescript
"use client";

import type { Icon } from "@/components/ui/Icon";
import {
```

Change to:
```typescript
import type { Icon } from "@/components/ui/Icon";
import {
```

(Delete line 1 `"use client";` and the blank line 2. Everything else in the file — the `ICON_COMPONENTS` record and the `resolveMarketingIcon` function — is unchanged.)

- [ ] **Step 2: Verify the build succeeds**

Run: `pnpm run build`
Expected: Exit code 0, no RSC boundary errors. This alone won't catch the InfoBar-specific runtime error described above (InfoBar is still `"use client"` at this point in the plan, so no server code calls `resolveMarketingIcon` yet) — this step just confirms the file itself compiles clean with the directive removed.

- [ ] **Step 3: Verify typecheck and lint stay clean**

Run: `pnpm run typecheck --pretty false && pnpm run lint`
Expected: 0 type errors; lint shows the same pre-existing warning count as before this change (this file has no `<img>` tags, so lint output should be unaffected).

- [ ] **Step 4: Commit**

```bash
git add "app/(marketing)/components/icon-registry.tsx"
git commit -m "refactor(marketing): remove unnecessary use client from icon-registry"
```

---

### Task 2: Convert `InfoBar.tsx` to a server component

**Depends on:** Task 1 (without it, this task's runtime check in Step 3 will fail with the client-reference-call error described in Task 1).

**Files:**
- Modify: `app/(marketing)/components/InfoBar.tsx:1`

**Interfaces:**
- Consumes: `resolveMarketingIcon` from `./icon-registry` (now callable from server code per Task 1).
- Produces: `InfoBar` component with an unchanged prop signature (`InfoBarProps` — `location`, `schedule`, `whatsapp`, `email`, `socials`, `googleRating`). Its call site in `app/page.tsx:141-151` (`<InfoBar {...marketingContent.infoBar} googleRating={...} />`) needs no changes — all props it receives are already fully resolved server-side data (`marketingContent.infoBar` comes from `adaptHomepageContent(homepageContent)`, itself derived from the server-fetched `getHomepageContent()`).

- [ ] **Step 1: Remove the `"use client"` directive**

Current `app/(marketing)/components/InfoBar.tsx:1-4`:
```typescript
"use client";

import type { MarketingIconName } from "./icon-types";
import { resolveMarketingIcon } from "./icon-registry";
```

Change to:
```typescript
import type { MarketingIconName } from "./icon-types";
import { resolveMarketingIcon } from "./icon-registry";
```

(Delete line 1 `"use client";` and the blank line 2. Every other line in the file — the type definitions, the `InfoBar` function body, all four `resolveMarketingIcon(...)` calls — is unchanged.)

- [ ] **Step 2: Verify the build succeeds**

Run: `pnpm run build`
Expected: Exit code 0, no RSC boundary errors on `app/page.tsx` (the only route rendering `InfoBar`).

- [ ] **Step 3: Manually verify the homepage in a browser (dev server)**

Run: `pnpm run dev`, then load `http://localhost:3000` in a browser.

Check:
- The info bar at the very top of the page renders: location badge with map-pin icon, schedule text with clock icon, the Google rating badge (if `googleReviews` resolved), the WhatsApp link with its icon, the email link with its icon, and the row of social icons — all icons must render (not blank/broken), matching how the page looked before this change.
- Open the browser console: confirm no hydration-mismatch warnings and no "Attempted to call ... from the server" runtime error.
- Click the WhatsApp link and one social icon link — confirm they still navigate/open correctly (`target="_blank"` behavior unchanged).

This is a real manual check, not an automated one — the spec is explicit that RSC hydration issues don't reliably surface in the test suite.

- [ ] **Step 4: Verify typecheck, lint, and existing tests stay clean**

Run: `pnpm run typecheck --pretty false && pnpm run lint && DATABASE_URL="file:./prisma/dev.db" pnpm run test`
Expected: 0 type errors; lint warning count unchanged from before this task; full test suite passes (no existing test renders `InfoBar` in isolation, so no test file is expected to need changes — confirm this is still true by checking `grep -rl InfoBar tests/` returns nothing, or if it does, that the found test still passes unmodified).

- [ ] **Step 5: Commit**

```bash
git add "app/(marketing)/components/InfoBar.tsx"
git commit -m "perf(marketing): convert InfoBar to a server component"
```

---

### Task 3: Convert 4 admin-dashboard components to server components

**Files:**
- Modify: `app/portal/admin/_components/AppointmentsTable.tsx:1`
- Modify: `app/portal/admin/_components/KPIStatCard.tsx:1`
- Modify: `app/portal/admin/_components/RevenueTrendChart.tsx:1`
- Modify: `app/portal/admin/_components/StaffOnDutyList.tsx:1`

**How these were found:** A heuristic sweep of every `"use client"`-marked file under `app/portal/**` (82 files) grepped for hook usage (`useState`, `useEffect`, `useRef`, `useContext`, `useCallback`, `useMemo`, `useReducer`, `use(`), navigation hooks (`usePathname`, `useRouter`, `useSearchParams`, `useSession`), event handler props (`onClick`, `onChange`, `onSubmit`, `onKeyDown`, `onFocus`, `onBlur`), and browser globals (`window.`, `document.`, `localStorage`, `sessionStorage`). Four files matched none of these signals. Each was then read in full (not just grepped) to confirm: all four are pure presentational components that receive already-resolved data as props and render static JSX — no hidden interactivity. All four are rendered exclusively from `app/portal/admin/page.tsx:85-101`, which is already a server component (`export default async function` with a server-side data fetch), passing plain data objects as props (`{...stat}`, `series`/`labels`/etc., `staff={staffOnDuty}`, appointment list props) — none of the call sites pass function props (event handlers) into these four components.

**Interfaces:**
- Consumes: nothing new — no changes to the props each component receives (`AppointmentItem[]`, `KPIStatCardProps`, `RevenueTrendChartProps`, `StaffMember[]`).
- Produces: all four components keep their existing exported names and prop signatures unchanged. `KPIStatCard` renders `TrendUp` (from `@/components/ui/Icon`, still `"use client"` per Global Constraints) directly as JSX (`<TrendUp className="inline h-3 w-3" />`) — this is fine unmodified, since rendering a client component as JSX from a server component is always valid (unlike Task 1's plain-function-call gotcha, there is no indirection here to fix).

- [ ] **Step 1: Remove the `"use client"` directive from all four files**

`app/portal/admin/_components/AppointmentsTable.tsx:1-4` — change from:
```typescript
"use client";

import Link from "next/link";

import { Table } from "@/app/portal/components/ui/Table";
```
to:
```typescript
import Link from "next/link";

import { Table } from "@/app/portal/components/ui/Table";
```

`app/portal/admin/_components/KPIStatCard.tsx:1-3` — change from:
```typescript
"use client";

import { TrendUp } from "@/components/ui/Icon";
```
to:
```typescript
import { TrendUp } from "@/components/ui/Icon";
```

`app/portal/admin/_components/RevenueTrendChart.tsx:1-3` — change from:
```typescript
"use client";

import { ChartSpark } from "@/app/portal/components/ui/ChartSpark";
```
to:
```typescript
import { ChartSpark } from "@/app/portal/components/ui/ChartSpark";
```

`app/portal/admin/_components/StaffOnDutyList.tsx:1-4` — change from:
```typescript
"use client";

import Link from "next/link";

import { AvatarFallback } from "@/app/portal/components/ui/AvatarFallback";
```
to:
```typescript
import Link from "next/link";

import { AvatarFallback } from "@/app/portal/components/ui/AvatarFallback";
```

(In each file, only the `"use client";` directive and the blank line immediately after it are removed. No other line changes.)

- [ ] **Step 2: Verify the build succeeds**

Run: `pnpm run build`
Expected: Exit code 0, no RSC boundary errors on `/portal/admin`.

- [ ] **Step 3: Manually verify the admin dashboard in a browser (dev server)**

Run: `pnpm run dev`, log in as an `ADMINISTRADOR` user (or use the test auth bypass per `lib/auth/credentials.ts` if configured locally), load `http://localhost:3000/portal/admin`.

Check:
- The 4 KPI stat cards at the top render with correct labels, values, and the `TrendUp` icon.
- The revenue trend chart renders with its sparkline (via `ChartSpark`) intact.
- The "Equipo activo" (staff on duty) list renders each staff member's avatar fallback, name, subtitle, and status dot in the correct color per status.
- The "Agenda del día" appointments table renders all columns and the status badges correctly, or the empty state if there are no appointments.
- Click the "Ver todos"/"Ver todas" links on the staff list and appointments table — confirm they still navigate to `/portal/admin/staff` and `/portal/admin/appointments` respectively.
- Open the browser console: confirm no hydration-mismatch warnings.

- [ ] **Step 4: Verify typecheck, lint, and existing tests stay clean**

Run: `pnpm run typecheck --pretty false && pnpm run lint && DATABASE_URL="file:./prisma/dev.db" pnpm run test`
Expected: 0 type errors; lint warning count unchanged; full test suite passes. Check `grep -rl "AppointmentsTable\|KPIStatCard\|RevenueTrendChart\|StaffOnDutyList" tests/` — if any test imports these components directly (rather than through a full page render), confirm it still passes unmodified; a component losing `"use client"` doesn't change its render output, so no test should need edits.

- [ ] **Step 5: Commit**

```bash
git add app/portal/admin/_components/AppointmentsTable.tsx app/portal/admin/_components/KPIStatCard.tsx app/portal/admin/_components/RevenueTrendChart.tsx app/portal/admin/_components/StaffOnDutyList.tsx
git commit -m "perf(portal): convert 4 admin dashboard components to server components"
```

---

### Task 4: Portal audit report + Hero/CampaignCarousel findings (no code)

This task produces no commit — it's the plan's "report findings" deliverable, matching the spec's requirement to report before converting anything further in the portal.

**Files:** None modified.

- [ ] **Step 1: Record the Hero/CampaignCarousel finding**

Write to the session's progress tracking (or directly to the user if running inline) that `Hero.tsx` and `CampaignCarousel.tsx`, both named as conversion candidates in the parent spec, were found already converted to server components (see "Deviation from the parent spec" above) — no task was needed for either, and this plan's actual code scope is Tasks 1–3 only.

- [ ] **Step 2: Record the portal sweep methodology and results**

Report:
- 82 files under `app/portal/**` were marked `"use client"` at the start of this plan (130 total `.tsx`/`.ts` files in the portal, 48 already server).
- All 82 were swept for hook/navigation-hook/event-handler/browser-global signals (see Task 3's grep pattern). 4 matched zero signals and were manually verified and converted in Task 3 (`AppointmentsTable`, `KPIStatCard`, `RevenueTrendChart`, `StaffOnDutyList`).
- The remaining ~78 client-marked portal files show genuine interactivity signals under this heuristic (forms, tables with client-side sort/filter, modals, calendars, live search, session/pathname-aware navigation shells, etc.) and are correctly staying client. This sweep is a heuristic grep-based signal check, not an exhaustive line-by-line read of all 78 remaining files — flag this explicitly as the audit's methodology and limitation, matching the spec's expectation that "real candidates are expected to be few or none."

- [ ] **Step 3: Confirm no further action is proposed**

Per the spec, do not convert any of the remaining 78 files in this plan. If a future pass wants to go deeper (individually reading each of the 78 for a false-positive interactivity signal, e.g. a file with an unused leftover `useState` import), that is out of scope here and would be its own follow-up, not silently done as part of this task.

---

## Verification (whole plan)

After all tasks:
```bash
pnpm run build && pnpm run typecheck --pretty false && pnpm run lint && DATABASE_URL="file:./prisma/dev.db" pnpm run test && pnpm audit
```

Expected: build clean, 0 type errors, lint warning count unchanged from before this plan (same pre-existing `<img>` warnings only), full test suite passing, no new audit findings.

Manual verification (both already covered per-task above, restated here as the whole-plan gate): homepage info bar renders and links work (Task 2); admin dashboard at `/portal/admin` renders and links work (Task 3). Both checked via `pnpm run dev` in a real browser with the console open, per the spec's explicit requirement that this phase not rely on automated tests alone.

## Out of scope (explicitly, not forgotten)

- No further portal conversions beyond the 4 files in Task 3 — the remaining ~78 client-marked portal files stay client per this plan's audit (Task 4).
- No changes to `@/components/ui/Icon.tsx` — it must stay `"use client"` (Global Constraints).
- No dependency or caching/ISR strategy changes — unrelated to this plan.
- No Lighthouse re-measurement task — this phase targets portal/authenticated-route JS reduction, not the public marketing site's Core Web Vitals (Phase 1 already measured and improved the marketing homepage specifically). If a before/after comparison is wanted later, it would need an authenticated Lighthouse run against `/portal/admin`, which is a separate concern from this plan's scope.
