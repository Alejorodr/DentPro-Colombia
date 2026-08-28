# Performance Phase 1: Fonts, Images, Bundle Visibility — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Load Outfit and Inter via `next/font/google` (fixing a spec gap where Outfit isn't loaded at all today), convert the 2 remaining non-optimized `<img>` tags to `next/image`, and add `@next/bundle-analyzer` for bundle visibility — all mechanical, low-risk changes with no behavior change beyond visual font rendering.

**Architecture:** `next/font/google` self-hosts font files at build time and exposes them as CSS custom properties via the `variable` option, applied at the `<html>` element so they're available anywhere in `globals.css`. Image conversions follow the existing `<Image>` pattern already used correctly elsewhere in this codebase (`Hero.tsx`, `SpecialistsSlider.tsx`). Bundle analyzer wraps the existing Next config object, inert unless `ANALYZE=true`.

**Tech Stack:** Next.js 16.3.0, `next/font/google`, `next/image`, `@next/bundle-analyzer@16.3.0`, `cross-env@10.1.0` (for portable `ANALYZE=true` across shells), pnpm.

## Global Constraints
- Repo uses **pnpm**, not npm (`packageManager: "pnpm@10.13.1"` in package.json).
- Build command is `next build --webpack` (not Turbopack) — see `package.json`'s `build` script.
- Full verification after every task: `pnpm run build && pnpm run typecheck --pretty false && pnpm run lint && DATABASE_URL="file:./prisma/dev.db" pnpm run test`.
- This repo's test suite has a known, pre-existing, unrelated pattern of transient worker-timeout flakiness under load ("Failed to start forks worker" / "Timeout waiting for worker to respond") — if a test file fails with that exact error, it's not a regression; re-run that file alone with `npx vitest run <file>` to confirm before treating it as real.
- Brand typography per CLAUDE.md: **Outfit** for display/headings, **Inter** for body — this plan fixes Outfit not being loaded at all.

---

### Task 1: Capture Lighthouse baseline (before any changes)

**Files:**
- Create: `docs/archive/plans/lighthouse-baseline.json` (scratch artifact, not committed — see step 3)

**Interfaces:**
- Consumes: nothing (first task)
- Produces: a baseline Lighthouse report used for comparison at the end of this plan (Task 7) — not consumed by other tasks' code, only by the final human-readable comparison.

- [x] **Step 1: Build and start a production server**

```bash
pnpm run build
```

Expected: build completes successfully (exit 0), same as current `main` — this task makes no code changes yet, it's establishing the "before" measurement.

- [x] **Step 2: Start the production server in the background**

```bash
pnpm run start
```
(or `next start` directly if `package.json` has no `start` script — check first with `grep -n '"start"' package.json`; if missing, run `npx next start` instead)

Run this in the background (it's a long-running server), then wait ~3 seconds for it to bind to its port (default 3000, confirm the actual port from the command's stdout).

- [x] **Step 3: Run Lighthouse against the homepage**

```bash
npx lighthouse http://localhost:3000 --output=json --output-path=docs/archive/plans/lighthouse-baseline.json --only-categories=performance --chrome-flags="--headless"
```

Expected: exits 0, produces a JSON report. Note the `performance` score and the `largest-contentful-paint`, `first-contentful-paint`, `cumulative-layout-shift`, and `total-byte-weight` (bundle-size-adjacent) audit values from the output — write them down in your task-completion notes for comparison against Task 7's after-measurement. This file is a scratch artifact for your own reference during this plan; it does not get committed (it's not part of the shipped app and isn't referenced by any other task).

- [x] **Step 4: Stop the production server**

Kill the background `pnpm run start` process before moving to Task 2 (it'll conflict with `pnpm run dev` otherwise, and you don't need it running for the remaining tasks).

- [x] **Step 5: No commit for this task**

This task only captures a measurement — there's no code change to commit. Proceed directly to Task 2.

---

### Task 2: Load Outfit and Inter via next/font/google

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css:248-251`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: CSS custom properties `--font-outfit` and `--font-inter`, applied at the `<html>` element, consumed by `app/globals.css`'s `body`/heading font-family rules within this same task.

- [x] **Step 1: Add next/font/google imports and font instances to app/layout.tsx**

Current top of `app/layout.tsx`:
```tsx
import Script from "next/script";
import { Suspense } from "react";
import { headers } from "next/headers";
import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { AppProviders } from "./providers";
```

Change to:
```tsx
import Script from "next/script";
import { Suspense } from "react";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { AppProviders } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});
```

- [x] **Step 2: Apply the font variable classNames to the `<html>` element**

Current line in `app/layout.tsx`:
```tsx
    <html lang="es" className="h-full" suppressHydrationWarning>
```

Change to:
```tsx
    <html lang="es" className={`h-full ${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
```

- [x] **Step 3: Update app/globals.css to consume the font variables**

Current (`app/globals.css:248-251`):
```css
  body {
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    @apply bg-slate-50 text-slate-900 antialiased transition-colors duration-300 dark:bg-surface-base dark:text-slate-100;
  }
```

Change to:
```css
  body {
    font-family: var(--font-inter), ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    @apply bg-slate-50 text-slate-900 antialiased transition-colors duration-300 dark:bg-surface-base dark:text-slate-100;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-family: var(--font-outfit), ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
```

- [x] **Step 4: Verify the build succeeds and fonts load correctly**

```bash
pnpm run build
```
Expected: exit 0, no new errors. `next/font/google` downloads and self-hosts the font files at build time — this requires network access during the build; if the build environment has no network access this step will fail with a font-fetch error (not expected in normal dev/CI environments, but note it if it happens).

```bash
pnpm run typecheck --pretty false
```
Expected: exit 0, 0 errors.

```bash
pnpm run lint
```
Expected: exit 0, same problem count as before this task (0 errors, existing warnings only).

- [x] **Step 5: Manually verify fonts render correctly**

```bash
pnpm run dev
```
Open `http://localhost:3000` in a browser (or use the `dev-browser`/`claude-in-chrome` tooling if available). Confirm:
- Headings (h1/h2/h3 — e.g. the Hero section's main heading) visually use a distinct font from body text (Outfit has a more geometric, rounded character vs Inter).
- No hydration warning in the browser console related to `className` mismatches on `<html>`.
- Open browser devtools → Network tab, confirm font files load from `/_next/static/media/` (self-hosted), not from `fonts.googleapis.com` (that would mean the self-hosting didn't work).

Stop the dev server after confirming.

- [x] **Step 6: Run the test suite**

```bash
DATABASE_URL="file:./prisma/dev.db" pnpm run test
```
Expected: same pass/fail count as the pre-existing baseline (this change touches no application logic, only font loading and CSS) — if a test fails, confirm via the flakiness-check process in Global Constraints before treating it as a regression.

- [x] **Step 7: Commit**

```bash
git add app/layout.tsx app/globals.css
git commit -m "$(cat <<'EOF'
perf(fonts): load Outfit and Inter via next/font/google

Outfit (brand heading font per CLAUDE.md) wasn't loaded at all
previously -- globals.css only had a plain Inter CSS fallback with no
next/font optimization. next/font/google self-hosts both font files
at build time (no runtime request to Google Fonts) and computes
fallback-font metrics automatically to avoid layout shift when the
real font swaps in.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Convert Navbar brand logo to next/image

**Files:**
- Modify: `app/(marketing)/components/Navbar.tsx:1-7,58-60`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing consumed by other tasks — this is a self-contained visual change.

**Context:** `brand.logoUrl` (optional, `string | undefined`) comes from admin-configurable homepage settings (`lib/marketing/homepage.ts:74`, defaulting to `null` in `lib/marketing/homepage-defaults.ts:16`, meaning the initials-badge fallback renders by default). When set, it's uploaded via the existing marketing-images admin upload flow, which lands on Vercel Blob storage — already covered by `next.config.ts`'s `remotePatterns` entry `{ protocol: "https", hostname: "**.public.blob.vercel-storage.com" }`, confirmed present. No `next.config.ts` change needed for this task.

- [x] **Step 1: Add the next/image import**

Current top of `app/(marketing)/components/Navbar.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";

import { List, SignIn, UserCircle, X } from "@/components/ui/Icon";

import { ThemeToggle } from "@/components/ThemeToggle";
```

Change to:
```tsx
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { List, SignIn, UserCircle, X } from "@/components/ui/Icon";

import { ThemeToggle } from "@/components/ThemeToggle";
```

- [x] **Step 2: Replace the `<img>` tag with `<Image>`**

Current (`app/(marketing)/components/Navbar.tsx:58-60`):
```tsx
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt={brand.name} className="h-10 w-10 rounded-full object-contain" />
          ) : (
```

Change to:
```tsx
          {brand.logoUrl ? (
            <Image
              src={brand.logoUrl}
              alt={brand.name}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-contain"
            />
          ) : (
```

- [x] **Step 3: Verify build, typecheck, lint**

```bash
pnpm run build
pnpm run typecheck --pretty false
pnpm run lint
```
Expected: all exit 0. Lint should show one fewer warning than before this task started (the `@next/next/no-img-element`-adjacent disable comment is now gone, and there's nothing to flag since `<Image>` doesn't trigger that rule).

- [x] **Step 4: Manually verify — with and without a logo set**

```bash
pnpm run dev
```
Load `http://localhost:3000`. Since `logoUrl` defaults to `null`, you'll see the initials badge (unchanged) — this confirms the conditional branch and fallback still work. If you want to verify the `<Image>` branch renders correctly too, you'd need an admin session to set a logo URL via the CMS (out of scope for this task to set up — the fallback-path check plus a successful `pnpm run build` compiling the `<Image>` branch is sufficient verification here, since `next/image` widely used elsewhere in this codebase already proves the component pattern works).

Stop the dev server after confirming.

- [x] **Step 5: Commit**

```bash
git add "app/(marketing)/components/Navbar.tsx"
git commit -m "$(cat <<'EOF'
perf(images): convert Navbar brand logo to next/image

brand.logoUrl is admin-configurable but always lands on Vercel Blob
storage via the existing marketing-images upload flow, already
covered by next.config.ts's remotePatterns -- safe to convert.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Convert HeroGoogleReviewRotator avatar to next/image

**Files:**
- Modify: `app/(marketing)/components/HeroGoogleReviewRotator.tsx` (check the top of the file for its current import list, then the block at lines ~130-137)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing consumed by other tasks.

**Context:** `review.authorPhotoUri` comes from the Google Places/Reviews API, always hosted at `lh3.googleusercontent.com` — already covered by `next.config.ts`'s `remotePatterns` entry `{ protocol: "https", hostname: "lh3.googleusercontent.com" }`, confirmed present. No `next.config.ts` change needed.

- [x] **Step 1: Add the next/image import**

Read the current import block at the top of `app/(marketing)/components/HeroGoogleReviewRotator.tsx` first (it may already import other things from `"react"` or elsewhere — add `import Image from "next/image";` as a new top-level import alongside them, following this repo's existing import-grouping convention of framework imports first).

- [x] **Step 2: Replace the `<img>` tag with `<Image>`**

Current (`app/(marketing)/components/HeroGoogleReviewRotator.tsx:130-137`):
```tsx
        {review.authorPhotoUri ? (
          <img
            src={review.authorPhotoUri}
            alt={review.authorName}
            className="h-12 w-12 rounded-full object-cover"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        ) : (
```

Change to:
```tsx
        {review.authorPhotoUri ? (
          <Image
            src={review.authorPhotoUri}
            alt={review.authorName}
            width={48}
            height={48}
            className="h-12 w-12 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
```

(`loading="lazy"` is dropped since it's `next/image`'s default behavior already, unless the component is later given a `priority` prop — no behavior change. `referrerPolicy` is a standard `<img>` HTML attribute that `next/image`'s `ImageProps` type also accepts and forwards through.)

- [x] **Step 3: Verify build, typecheck, lint**

```bash
pnpm run build
pnpm run typecheck --pretty false
pnpm run lint
```
Expected: all exit 0. Lint should now show 0 `@next/next/no-img-element` warnings for this file (was 1 before this task).

- [x] **Step 4: Manually verify in the browser**

```bash
pnpm run dev
```
Load `http://localhost:3000`, scroll to the Hero section's Google review rotator. Confirm the reviewer avatar image renders correctly (or the initials fallback, if `authorPhotoUri` is absent for the current review data) and the rotation still cycles through reviews without console errors.

Stop the dev server after confirming.

- [x] **Step 5: Commit**

```bash
git add "app/(marketing)/components/HeroGoogleReviewRotator.tsx"
git commit -m "$(cat <<'EOF'
perf(images): convert Google review avatar to next/image

review.authorPhotoUri is always hosted at lh3.googleusercontent.com,
already covered by next.config.ts's remotePatterns.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Add @next/bundle-analyzer

**Files:**
- Modify: `package.json` (add 2 devDependencies, 1 script)
- Modify: `next.config.ts:1,81`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: an `ANALYZE=true pnpm run build` path (via the new `analyze` script) that later tasks/future maintainers can invoke — Task 6 consumes this directly.

- [x] **Step 1: Add the two new devDependencies**

```bash
pnpm add -D @next/bundle-analyzer@16.3.0 cross-env@10.1.0
```

Expected: `pnpm-lock.yaml` and `package.json` update, install succeeds.

- [x] **Step 2: Add the `analyze` script to package.json**

Find the `"scripts"` block in `package.json` (starts around line 8). Add a new `"analyze"` entry alongside the existing `"build"` script:

```json
    "analyze": "cross-env ANALYZE=true node scripts/run-ci-command.mjs \"prisma generate && next build --webpack\"",
```

(Match the existing `"build"` script's exact command, just prefixed with `cross-env ANALYZE=true` so it works identically across bash/cmd/PowerShell.)

- [x] **Step 3: Wire the bundle analyzer into next.config.ts**

Current top of `next.config.ts`:
```ts
import type { NextConfig } from "next";
```

Change to:
```ts
import type { NextConfig } from "next";
import withBundleAnalyzerInit from "@next/bundle-analyzer";

const withBundleAnalyzer = withBundleAnalyzerInit({
  enabled: process.env.ANALYZE === "true",
});
```

Current bottom of `next.config.ts`:
```ts
export default nextConfig;
```

Change to:
```ts
export default withBundleAnalyzer(nextConfig);
```

- [x] **Step 4: Verify a normal build still works (analyzer inert by default)**

```bash
pnpm run build
```
Expected: exit 0, identical behavior to before this task — `withBundleAnalyzer` is a no-op wrapper when `ANALYZE` isn't `"true"`.

```bash
pnpm run typecheck --pretty false
pnpm run lint
```
Expected: both exit 0.

- [x] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml next.config.ts
git commit -m "$(cat <<'EOF'
chore(perf): add @next/bundle-analyzer behind ANALYZE=true

Wraps the existing next.config.ts export, inert unless ANALYZE=true
is set (via the new `analyze` script, using cross-env for portability
across shells). Zero runtime cost when not analyzing.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Run the bundle analyzer and report findings

**Files:** none (this task produces a report in your final summary to the user, not a code change)

**Interfaces:**
- Consumes: the `analyze` script from Task 5.
- Produces: a findings report for the user — no other task depends on this programmatically.

- [x] **Step 1: Run the analyzer**

```bash
pnpm run analyze
```
Expected: build completes, and (depending on `@next/bundle-analyzer`'s default behavior) either opens browser tabs with interactive treemap visualizations, or writes static HTML reports under `.next/analyze/`. If it tries to open a browser and none is available in this environment, check `.next/analyze/*.html` for the generated reports instead.

- [x] **Step 2: Note the largest contributors**

Look at the client and server bundle treemaps. Note the top 5-10 largest packages/modules by size. Compare against the recon's finding that no obviously heavy dependencies were found (no moment.js, no full lodash, no chart libraries) — confirm that holds, or flag anything surprisingly large.

- [x] **Step 3: No commit for this task**

This is a measurement/reporting step, not a code change — include your findings in the final summary when this plan is complete. Per the spec, do not act on bundle-size findings in this phase unless something is alarming enough to flag as a follow-up (not fixed inline).

---

### Task 7: Final Lighthouse comparison and full verification

**Files:** none (final verification pass)

**Interfaces:**
- Consumes: Task 1's baseline measurement.
- Produces: the final "before/after" comparison reported to the user.

- [x] **Step 1: Full verification suite**

```bash
pnpm run build
pnpm run typecheck --pretty false
pnpm run lint
DATABASE_URL="file:./prisma/dev.db" pnpm run test
pnpm audit
```
Expected: build/typecheck/lint clean (0 errors), test suite passing at the same rate as the pre-Phase-1 baseline (re-run individual files per the flakiness note in Global Constraints if anything looks off), audit showing no new vulnerabilities from the 2 new devDependencies added in Task 5.

- [x] **Step 2: Start a production server and re-run Lighthouse**

```bash
pnpm run start
```
(background, wait for it to bind)

```bash
npx lighthouse http://localhost:3000 --output=json --output-path=docs/archive/plans/lighthouse-after-phase1.json --only-categories=performance --chrome-flags="--headless"
```

Stop the production server after this completes.

- [x] **Step 3: Compare and report**

Compare `lighthouse-baseline.json` (Task 1) against `lighthouse-after-phase1.json` (this task) on: `performance` score, `largest-contentful-paint`, `first-contentful-paint`, `cumulative-layout-shift`, `total-byte-weight`. Report the before/after numbers to the user directly (do not just say "it improved" — show the actual figures). Both JSON files are scratch artifacts for this comparison, not committed to the repo (they're build-environment-specific measurements, not source of truth).

- [x] **Step 4: Clean up scratch files**

```bash
rm -f docs/archive/plans/lighthouse-baseline.json docs/archive/plans/lighthouse-after-phase1.json
git status --short
```
Expected: clean working tree (these files were never `git add`ed, so nothing to unstage — this just confirms no stray files remain).

- [x] **Step 5: No commit for this task**

This is the final verification pass. If everything above is clean, Phase 1 is complete. Phase 2 (client → server component conversion) gets its own separate plan per the design spec, started only after Phase 1's changes are confirmed stable.

---

## Execution log: retroactive Lighthouse before/after (2026-08-11)

Tasks 2-6 (fonts, images, bundle analyzer) were implemented and committed (`3c1eea4`, `52d078b`, `e56b598`, `08f1ba8`), but Task 1/Task 7's Lighthouse before/after comparison was never actually run at the time — the plan's checkboxes were left unmarked and no comparison was reported. This was caught and run retroactively, after Phase 2 (server-component conversion) had also already shipped.

**Method:** since the working tree had already moved past Phase 1, "before" was captured by building a git worktree checked out at `c5aa7c3` (last commit before any Phase 1 code change) rather than the current tree. "After" is the current `main` HEAD, which includes **both** Phase 1 and Phase 2 changes combined (Phase 2 had already merged by the time this was run) — this comparison is not Phase-1-isolated. Both were built with `pnpm run build && pnpm run start` (production mode, not dev) on separate ports, measured with `npx lighthouse --only-categories=performance --chrome-flags="--headless"`, single run each (no multi-run median — read the deltas with that noise margin in mind, roughly ±10-15% is expected run-to-run variance for Speed Index/TBT in particular).

| Metric | Before (`c5aa7c3`) | After (`main`, Phase 1+2) | Delta |
|---|---|---|---|
| Performance score | 90 | 93 | +3 |
| First Contentful Paint | 1.0 s | 0.9 s | -0.1 s |
| Largest Contentful Paint | 2.9 s | 2.7 s | -0.2 s |
| Cumulative Layout Shift | 0 | 0 | no change |
| Total Blocking Time | 250 ms | 210 ms | -40 ms |
| Speed Index | 1.7 s | 1.9 s | +0.2 s (worse) |
| Total byte weight | 280 KiB | 361 KiB | +81 KiB (worse) |

**Reading this honestly:** performance score, FCP, LCP, and TBT all improved. Speed Index and total byte weight got worse, not better — self-hosting Outfit+Inter via `next/font` and converting 2 `<img>` tags to `next/image` both add bytes (font files, `next/image`'s wrapper/srcset markup) that a bare CSS-fallback font and raw `<img>` tags didn't ship, even though they remove render-blocking external requests and cut CLS risk. Net effect on the metrics that matter most for UX (LCP, TBT, CLS) is positive; total payload size is not the win here, request-blocking/layout-stability is. This is a single-run measurement on a local machine, not a CI-grade benchmark — treat the direction (small, real improvement across most metrics) as trustworthy, not the exact millisecond figures.

Cleanup performed: worktree removed (`git worktree remove`), both production servers stopped, scratch Lighthouse JSON/log files deleted — nothing new added to the repo by this measurement pass.

## Self-Review Notes (completed during plan authoring)

- **Spec coverage:** Fonts (Task 2) ✓, images (Tasks 3-4) ✓, bundle analyzer (Tasks 5-6) ✓, Lighthouse before/after (Tasks 1, 7) ✓, full verification per task ✓. Phase 2 is explicitly out of this plan's scope per the spec ("each phase gets its own implementation plan").
- **Placeholder scan:** no TBD/TODO; all code blocks show exact before/after content.
- **Type consistency:** `Image` import name used consistently across Tasks 3-4; `withBundleAnalyzer`/`nextConfig` naming consistent within Task 5's own steps (no cross-task dependency on these names).
