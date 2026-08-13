# UI Polish Phase A: Marketing Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `app/(marketing)/**` and `app/page.tsx` into conformance with the brand rules in `CLAUDE.md` / `design-system/` — fix confirmed card-pattern and icon-barrel violations, then manually verify every marketing page is symmetric, organized, and responsive at 3 breakpoints.

**Architecture:** Two components (`CampaignCarousel.tsx`, `FAQSection.tsx`) get their card styling aligned to the existing `.card` utility's token values (not the literal utility class, in one case — see Task 1's rationale) and their icon usage moved onto the shared `Icon.tsx` barrel. A third task compiles a findings report for genuinely ambiguous cases (rating-star gold color, error-alert red, one icon-container size mismatch) that need the user's call, not a silent fix. A fourth task is the manual 3-breakpoint visual verification the spec requires. No new components, no layout redesign — this is a conformance pass against tokens and patterns that already exist in the codebase.

**Tech Stack:** Next.js 16 App Router, Tailwind v4 (`@utility card` / `@utility icon-badge` / `@utility icon-circle` in `app/globals.css`), Phosphor Icons via `components/ui/Icon.tsx`, TypeScript.

## Global Constraints

- Brand palette only: `brand-teal (#0a3d91)`, `brand-indigo (#1f6cd3)`, `brand-sky (#4cc3f1)`, `brand-light (#e6f4ff)`, `accent-cyan (#5bd0ff)`, `slate-*` neutrals. No green/purple/warm colors, except the approved status-color exception (not applicable to marketing — no appointment/staff-status UI in this scope) and cases explicitly reported to the user in Task 3.
- Icons always via `@/components/ui/Icon.tsx` — never a direct `@phosphor-icons/react` import, never a raw inline `<svg>`, never a raw text glyph standing in for an icon.
- Signature card tokens (already codified as `@utility card` in `app/globals.css:94-96`): `relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/90 p-6 shadow-xl shadow-slate-900/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl dark:border-surface-muted/60 dark:bg-surface-base/85 dark:shadow-surface-dark`.
- Every `bg-*`/`text-*` class added or changed must keep a working `dark:` variant — this codebase is dark-mode-complete, don't regress it.
- `pnpm run build` must pass before every commit.
- Spanish (Colombia), tú-form, sentence case — not touched by this plan's changes, but don't introduce new copy that violates it.
- Full verification gate for every task: `pnpm run build && pnpm run typecheck --pretty false && pnpm run lint && DATABASE_URL="file:./prisma/dev.db" pnpm run test`.

---

### Task 1: Align `CampaignCarousel.tsx` card to signature tokens

**Files:**
- Modify: `app/(marketing)/components/CampaignCarousel.tsx:52-57`

**Context:** The confirmed mechanical-sweep finding: this card uses `rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60` — none of these match the signature card's `rounded-[1.75rem] border-white/70 bg-white/90 shadow-xl shadow-slate-900/10`, and it has no `hover:-translate-y-1 hover:shadow-2xl` lift at all.

**Why not just apply `className="card ..."` directly:** the `.card` utility bundles `p-6` padding on all sides. This card has an edge-to-edge image header (`h-40 w-full` `<Image fill>` at the top, no padding) with padded text content below it — applying `.card`'s uniform padding would inset the image and break the flush top edge. So this task hand-aligns the individual token *values* from `.card` (radius, border, background, shadow, hover, transition, dark-mode pairs) without adopting the padded utility wholesale, matching what `Hero.tsx:80` already does when overriding parts of `.card` for its own layout needs.

**Interfaces:**
- Consumes: nothing new.
- Produces: `CampaignCarousel` renders identically in data/layout terms (image, title, description, CTA) — only the outer card's visual chrome changes. No prop or export signature changes.

- [ ] **Step 1: Update the card's outer classes**

Current `app/(marketing)/components/CampaignCarousel.tsx:52-56`:
```tsx
          <article
            key={campaign.id}
            className="min-w-[280px] max-w-xs rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60 dark:border-accent-cyan/10 dark:bg-surface-elevated dark:shadow-none"
            role="listitem"
          >
```

Change to:
```tsx
          <article
            key={campaign.id}
            className="relative min-w-[280px] max-w-xs overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/90 shadow-xl shadow-slate-900/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl dark:border-surface-muted/60 dark:bg-surface-base/85 dark:shadow-surface-dark"
            role="listitem"
          >
```

- [ ] **Step 2: Match the image's top corner radius to the new outer radius**

Current `app/(marketing)/components/CampaignCarousel.tsx:57`:
```tsx
            <div className="relative h-40 w-full overflow-hidden rounded-t-3xl">
```

Change to:
```tsx
            <div className="relative h-40 w-full overflow-hidden rounded-t-[1.75rem]">
```

- [ ] **Step 3: Verify the build succeeds**

Run: `pnpm run build`
Expected: Exit code 0.

- [ ] **Step 4: Manually check the campaign carousel renders correctly**

Run `pnpm run dev`, load `http://localhost:3000`. If no active campaigns exist in the local database, `CampaignCarousel` returns `null` and renders nothing (see `CampaignCarousel.tsx:38-40`) — this is expected and not a regression; skip the visual check in that case and rely on Task 4's full page pass instead. If a campaign is active, confirm: rounded corners are visibly softer/larger than before, the card lifts slightly and its shadow deepens on hover, the image's top corners still align flush with the card's own rounded corners (no visible seam/gap).

- [ ] **Step 5: Verify typecheck and lint stay clean**

Run: `pnpm run typecheck --pretty false && pnpm run lint`
Expected: 0 type errors; lint warning count unchanged from before this task.

- [ ] **Step 6: Commit**

```bash
git add "app/(marketing)/components/CampaignCarousel.tsx"
git commit -m "fix(marketing): align CampaignCarousel card to signature card tokens"
```

---

### Task 2: Align `FAQSection.tsx` card + replace raw SVG toggle icon with the Icon barrel

**Files:**
- Modify: `components/ui/Icon.tsx:1-77` (add `Plus` export)
- Modify: `app/(marketing)/components/FAQSection.tsx:1-68`

**Context:** Two confirmed findings in the same file: (1) each FAQ accordion item uses `rounded-2xl border border-slate-200 bg-white` instead of signature-card tokens, and (2) the expand/collapse toggle icon is a raw inline `<svg>` (a plus shape that rotates 45° to become an X when open) instead of a Phosphor icon from the barrel — a more direct violation of "icons always via `Icon.tsx`" than even a direct `@phosphor-icons/react` import would be.

**Design call on hover-lift:** unlike `CampaignCarousel` (a horizontally-scrolling promo/nav card, where lift-on-hover is a natural affordance), these are vertically-stacked accordion toggles in a `space-y-3` list. Applying `hover:-translate-y-1` to each one individually would make the list feel like it's jittering rather than reading as a data disclosure. This task aligns radius/border/background/dark-mode tokens to match the signature card's *color and shape* values, but deliberately omits the shadow-xl/hover-lift/transition-all part — the same kind of selective override `Hero.tsx:80` already applies when `.card`'s default hover doesn't fit a given layout.

**Interfaces:**
- Consumes: `Plus` — new named export from `components/ui/Icon.tsx`, re-exported from `@phosphor-icons/react` alongside the other icons already there.
- Produces: `FAQSection` renders identically in data/behavior terms (same props, same expand/collapse state logic) — only the toggle icon's rendering and the item container's visual chrome change.

- [ ] **Step 1: Add `Plus` to the Icon barrel**

Current `components/ui/Icon.tsx:50-53`:
```tsx
  PencilSimple,
  Phone,
  Printer,
  Question,
```

Change to:
```tsx
  PencilSimple,
  Phone,
  Plus,
  Printer,
  Question,
```

(Single insertion, keeping the existing alphabetical-ish ordering of the surrounding names — `Plus` sorts between `Phone` and `Printer`.)

- [ ] **Step 2: Update the FAQ item container's classes**

Current `app/(marketing)/components/FAQSection.tsx:33-36`:
```tsx
            <div
              key={item.question}
              className="rounded-2xl border border-slate-200 bg-white transition-colors duration-200 dark:border-accent-cyan/10 dark:bg-surface-elevated"
            >
```

Change to:
```tsx
            <div
              key={item.question}
              className="relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/90 transition-colors duration-300 dark:border-surface-muted/60 dark:bg-surface-base/85"
            >
```

- [ ] **Step 3: Replace the raw inline SVG with the `Plus` icon**

Add the import at the top of the file — current `app/(marketing)/components/FAQSection.tsx:1-3`:
```tsx
"use client";

import { useState } from "react";
```

Change to:
```tsx
"use client";

import { useState } from "react";

import { Plus } from "@/components/ui/Icon";
```

Then replace the toggle icon markup — current `app/(marketing)/components/FAQSection.tsx:45-54`:
```tsx
                  <span
                    className={`flex-shrink-0 text-brand-teal transition-transform duration-200 dark:text-accent-cyan ${
                      openIndex === i ? "rotate-45" : ""
                    }`}
                    aria-hidden="true"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
```

Change to:
```tsx
                  <Plus
                    className={`h-5 w-5 flex-shrink-0 text-brand-teal transition-transform duration-200 dark:text-accent-cyan ${
                      openIndex === i ? "rotate-45" : ""
                    }`}
                    weight="bold"
                    aria-hidden="true"
                  />
```

- [ ] **Step 4: Verify the build succeeds**

Run: `pnpm run build`
Expected: Exit code 0.

- [ ] **Step 5: Manually check the FAQ section renders and toggles correctly**

Run `pnpm run dev`, load `http://localhost:3000`, scroll to "Preguntas frecuentes". Confirm: item corners are visibly softer/larger, border reads as a very light translucent white rather than solid slate-200, clicking a question still expands/collapses its answer, the plus icon still visibly rotates 45° into an X-like shape when a question is open and rotates back when closed.

- [ ] **Step 6: Verify typecheck and lint stay clean**

Run: `pnpm run typecheck --pretty false && pnpm run lint`
Expected: 0 type errors; lint warning count unchanged from before this task.

- [ ] **Step 7: Commit**

```bash
git add "components/ui/Icon.tsx" "app/(marketing)/components/FAQSection.tsx"
git commit -m "fix(marketing): align FAQSection card tokens, replace raw SVG toggle with Icon barrel"
```

---

### Task 3: Findings report — ambiguous cases requiring a user decision (no code)

**Files:** None modified. This task's deliverable is the report itself, appended to this plan's execution log (see bottom of this file) and relayed to the user directly — matching the "report findings, don't guess" principle the parent spec sets for anything not objectively a token mismatch.

**Interfaces:** None — this task produces no code and nothing later tasks depend on.

- [ ] **Step 1: Report the rating-star gold-color inconsistency**

`app/(marketing)/components/HeroGoogleReviewRotator.tsx:84,117-118` uses a dedicated `--color-gold-bright: #e6b450` token (defined in `app/globals.css:220`) plus raw `★` Unicode glyphs to render Google review star ratings, in 3 places. `app/(marketing)/components/InfoBar.tsx:60,65,69,72` renders a similar star-rating badge but with generic Tailwind `amber-50`/`amber-700`/`amber-500` classes (not the `gold-bright` token) and 2 more raw `★` glyphs — inconsistent with `HeroGoogleReviewRotator`'s own approach, and both conflict with `CLAUDE.md`'s explicit rule: *"Dorado (#c8901f) solo en logos impresos, nunca en UI."* This isn't an accidental one-off: it's a consistent, repeated pattern (5 occurrences across 2 files) built around a purpose-made design token, strongly suggesting it was a deliberate choice to keep Google's star-rating visual convention recognizable — gold/amber stars are how users everywhere recognize "this is a review rating." Flagging rather than fixing because reverting this to brand-blue is a real product/trust-signal decision, not a mechanical token correction. If the user wants it fixed: standardize both files on the `gold-bright` token (drop `InfoBar`'s raw `amber-*` classes), add a `Star` icon to the `Icon.tsx` barrel to replace the raw `★` glyphs in both files, and update `CLAUDE.md`'s gold rule to carve out this exception explicitly so it doesn't get re-flagged in Phase B or future audits.

- [ ] **Step 2: Report the error-alert red color**

`app/(marketing)/components/LoginFormCard.tsx:184-193` uses `border-red-200 bg-red-50 text-red-800` (plus `text-red-500` on its `WarningCircle` icon, which is already correctly sourced from the `Icon.tsx` barrel) for a login-failure validation message. Red-for-error is a near-universal UX convention, similar in kind to the status-color exception already approved for appointment/staff status — but that approval was scoped specifically to "estados" (appointment/staff status), not error/validation messaging, so this wasn't automatically covered. Recommend treating validation-error red as a second, explicitly approved exception category (update `CLAUDE.md` accordingly) rather than migrating it to brand-blue, since blue-on-blue would weaken the error's visual urgency. Not changed in this task pending confirmation.

- [ ] **Step 3: Report the LoginModal icon-container size mismatch**

`app/(marketing)/components/LoginModal.tsx:69` uses `inline-flex h-12 w-12 ... rounded-2xl bg-white/15` for a standalone icon container. This is 48px, matching neither of the two defined icon-container tokens in `app/globals.css`: `icon-badge` (`h-10 w-10`, 40px, `app/globals.css:102-104`) or `icon-circle` (`h-14 w-14`, 56px, `app/globals.css:98-100`). Low-severity — recommend switching to `icon-circle` (56px) since it's used as a prominent standalone hero icon in the modal's aside panel, matching the visual weight `icon-circle` gets elsewhere, but this is a minor enough deviation that it's reasonable to batch into a later cleanup pass instead of this plan if the user would rather not touch `LoginModal.tsx` right now.

- [ ] **Step 4: No commit for this task**

This is a reporting step. Present the three findings above to the user directly when this task completes; do not act on any of them without an explicit decision, and do not block Task 4 on that decision — the manual visual pass proceeds regardless.

---

### Task 4: Manual 3-breakpoint visual verification (symmetry, spacing, responsiveness)

**Files:** None modified — verification only.

**Interfaces:**
- Consumes: Tasks 1-2's changes (verifies they render correctly at all breakpoints, not just the single check already done in their own Step 4/5).
- Produces: a pass/fail visual confirmation for each page, reported to the user.

**Pages in scope** (everything under `app/(marketing)/**` and `app/page.tsx`):
1. Homepage (`http://localhost:3000/`) — includes `Navbar`, `InfoBar`, `Hero`, `CampaignCarousel`, `Services`, `SpecialistsSlider`, `FAQSection`, `ContactSection`, `FloatingActions`, `BookingForm`.
2. A service detail page, representative of all 6 (`http://localhost:3000/servicios/ortodoncia` — same template as `/servicios/implantes`, `/servicios/estetica-dental`, `/servicios/endodoncia`, `/servicios/limpieza-dental`, `/servicios/odontopediatria`; checking one confirms the shared template, the other 5 don't need separate passes unless this one shows a problem).
3. Login page (`http://localhost:3000/login` — `LoginForm.tsx` + `LoginModal.tsx`).

**Breakpoints:** 375px (mobile), 768px (tablet), 1280px (desktop) — viewport width, default height.

- [ ] **Step 1: Start the dev server**

Run: `pnpm run dev`
Wait for it to bind (`✓ Ready` in the log, or poll `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` until it returns `200`).

- [ ] **Step 2: Check the homepage at all 3 breakpoints**

Using the browser automation tools (`mcp__claude-in-chrome__tabs_create_mcp`, `navigate`, `resize_window`, `computer` with `action: "screenshot"`): navigate to `http://localhost:3000/`, resize the window to 375px width, screenshot; resize to 768px, screenshot; resize to 1280px, screenshot. At each width, visually confirm: no horizontal overflow/scrollbar, no overlapping text or icons, consistent spacing rhythm between sections (no section suddenly cramped or with a huge gap relative to its neighbors), the `InfoBar`/`Navbar` don't break or wrap awkwardly, `CampaignCarousel` and `FAQSection` (Tasks 1-2's changes) render with visibly correct rounded corners and no layout shift from their old versions, `SpecialistsSlider` and `BookingForm` remain usable (buttons/inputs not clipped or overlapping) at 375px. Compare against `design-system/ui_kits/marketing/index.html` as the layout reference where useful.

- [ ] **Step 3: Check the service detail page at all 3 breakpoints**

Same procedure as Step 2, at `http://localhost:3000/servicios/ortodoncia`. Confirm: hero/header section for the service is symmetric and doesn't overflow, any content grid (features, before/after, etc.) reflows sensibly from multi-column at 1280px down to single-column at 375px without orphaned/uneven items, CTA buttons remain full-width-appropriate on mobile and don't stretch awkwardly on desktop.

- [ ] **Step 4: Check the login page at all 3 breakpoints**

Same procedure as Step 2, at `http://localhost:3000/login`. Confirm: the two-pane layout (`LoginFormCard` + `LoginModal`'s aside, if both render on this route — verify actual composition first) collapses sensibly on mobile (stacked, not squeezed side-by-side), form inputs and buttons stay full-width and aligned on all 3 widths, no text truncation or overlap.

- [ ] **Step 5: Report results**

For each page/breakpoint combination, report pass or a specific, concrete issue (not "looks a bit off" — name the element and the problem, e.g. "at 375px the FAQ section's answer text touches the card's right edge with no padding"). If any issues are found, they are new findings for a follow-up fix — this task's job is to surface them accurately, not to fix them inline (fixing would be scope creep beyond what Tasks 1-2 already defined).

- [ ] **Step 6: Stop the dev server**

Stop the background `pnpm run dev` process once verification is complete.

- [ ] **Step 7: No commit for this task**

Verification-only; nothing to commit unless Step 5 surfaced issues the user wants fixed now, in which case that becomes new, separately-scoped work — not silently folded into this task.

---

### Task 5: Final full verification

**Files:** None — final gate.

**Interfaces:**
- Consumes: Tasks 1-2's code changes.
- Produces: confirmation that Phase A is complete and stable.

- [ ] **Step 1: Run the full verification suite**

```bash
pnpm run build
pnpm run typecheck --pretty false
pnpm run lint
DATABASE_URL="file:./prisma/dev.db" pnpm run test
pnpm audit
```
Expected: build/typecheck/lint clean (0 errors, lint warning count unchanged from before this plan — same pre-existing `<img>` warnings only), test suite passing, no new audit findings (no dependencies were added or changed in this plan).

- [ ] **Step 2: Confirm Task 4's findings are resolved or explicitly deferred**

If Task 4 surfaced any issues, confirm with the user whether they're fixed now (as new, separately-committed work) or explicitly deferred to a follow-up — don't let this plan close with silently-dropped findings.

- [ ] **Step 3: No commit for this task**

This is the final verification pass. If everything above is clean, Phase A is complete. Phase B (portal, 4 roles) gets its own separate plan per the design spec.

---

## Self-Review Notes (completed during plan authoring)

- **Spec coverage:** icon-barrel violations ✓ (none found in actual `app/(marketing)/**` scope after re-running the sweep precisely scoped — see note below; the raw-SVG and raw-glyph findings in Tasks 2-3 are arguably worse violations of the same underlying rule and are covered instead), off-palette-color mechanical sweep ✓ (Task 3, all 4 raw hits were `InfoBar.tsx`'s amber rating badge, folded into the findings report since it's a judgment call not a mechanical fix), signature-card pattern ✓ (Tasks 1-2, the only 2 genuine card-shaped elements with token mismatches found in the sweep), symmetry/organization/responsive requirement ✓ (Task 4), status-color exception rule — not applicable, no status UI exists in marketing scope.
- **Correction versus the parent spec's recon:** the spec's recon (written during brainstorming, before this plan's own from-scratch sweep) named `app/(dashboard)/components/SpecialistsShowcase.tsx` as "the one confirmed icon-barrel violation." Re-running the sweep scoped exactly to `app/(marketing)/**` and `app/page.tsx` (this plan's actual boundary) found **zero** icon-barrel violations in that scope — `SpecialistsShowcase.tsx` lives under `app/(dashboard)/[role]/...`, a separate route group that is not referenced anywhere else in the codebase (`grep -rl SpecialistsShowcase app/` finds no importers) and is not mentioned in `CLAUDE.md`'s documented architecture (`app/(marketing)/`, `app/portal/`). This looks like orphaned/legacy code predating the current `app/portal/` structure, not a marketing-site file — it's out of this plan's scope by path, and "fixing" a possibly-dead file's icon import would be pointless if nothing renders it. Flagged to the user as a separate finding, not folded into this plan's tasks.
- **Placeholder scan:** no TBD/TODO; every step shows exact before/after code.
- **Type consistency:** `Plus` import name used identically in Task 2's barrel-export step and its usage step. No cross-task function/type dependencies beyond that.

## Execution log

_(Filled in as tasks complete — findings from Task 3 and Task 4 get recorded here, not just relayed verbally, so this plan stays a complete record like the performance plans.)_

### Task 1 — complete
Commits 8882dda..3202ce2. CampaignCarousel card aligned to signature tokens. Build/typecheck/lint clean. Review: approved, no findings.

### Task 2 — complete
Commits 3202ce2..a863057. FAQSection card aligned (radius/border/bg/dark, no hover-lift per design call), raw SVG toggle replaced with `Plus` from Icon barrel. Build/typecheck/lint clean. Review: approved, no findings.

### Task 3 — findings relayed to user 2026-08-12, all three approved and applied (Task 3b)
- Rating stars: approved — standardized on `gold-bright` token + new `Star` icon (Icon.tsx barrel), `InfoBar.tsx` badge chrome moved off `amber-*`. Commits a863057..3b274fc.
- Error-alert red: approved as documented exception — added to `CLAUDE.md` `### Colores`. No code change to `LoginFormCard.tsx`.
- LoginModal icon size: approved — switched to `icon-circle` (56px). Fix-round 1 required: `icon-circle`'s own `text-brand-teal` color broke the intended white icon on the gradient aside — fixed with explicit `text-white dark:text-white` + `border-transparent`. Commits 3b274fc..8dadbe8.
Task 3b complete (commits a863057..8dadbe8, review clean after 1 fix round).

### Task 4 — complete 2026-08-13
Verified live at mobile and desktop widths: homepage (hero/InfoBar/services/specialists slider, no overflow, signature-card radius consistent; FAQSection's `Plus`→X rotation and expand/collapse confirmed working; CampaignCarousel didn't render — no active campaign in dev DB, expected), service-detail page (`/servicios/ortodoncia` — hero, feature grid reflow, CTAs all correct), and login (`/login` → `/auth/login`, single-column form, correct on all widths).

**Side-finding:** `app/(marketing)/components/LoginModal.tsx` — the component Task 3b's icon-color fix targeted — has zero importers under `app/` (confirmed by grep). It's dead code, never rendered on any live route, same category as the plan's own Self-Review note about `SpecialistsShowcase.tsx`. The fix is still correct, just unreachable. Not deleted — out of this plan's scope, flagged for the user's call.

**Infra note (unrelated to this plan):** the dev server hit intermittent Neon Postgres transaction-pooler errors (`P2028: Unable to start a transaction in the given time`) on `/servicios/[slug]` during this session, resolved by restarting a stale `next dev` process. Pre-existing environment flakiness, not caused by Tasks 1-3b.

### Task 5 — final verification, complete 2026-08-12
`npm run build` exit 0, `npm run typecheck` exit 0, `npm run lint` exit 0 (4 pre-existing `@next/next/no-img-element` warnings only, unchanged from baseline), `DATABASE_URL="file:./prisma/dev.db" npm run test` exit 0. `npm audit` skipped — repo has no `package-lock.json` (only `pnpm-lock.yaml`, pnpm not installed in this environment) and this plan changed no dependencies, so the audit gate is moot. Phase A code work is complete; Task 4's manual visual pass is the one open item, deferred to the user.
