# Performance / Core Web Vitals — Design

## Context

Following a code-quality and security round (dependency upgrades, lint cleanup, audit logging, middleware failsafe — see recent commit history), the user asked to tackle three deferred, visually-oriented workstreams: performance, UI polish against `design-system/`, and a visual redesign. These three are independent subsystems, each needing its own spec → plan → implementation cycle. This document covers the first: **performance / Core Web Vitals**.

A pre-brainstorm recon (see conversation) surfaced a real, surprising gap: CLAUDE.md specifies **Outfit** for headings and **Inter** for body text as the brand typography, but the current codebase loads neither via `next/font` — `app/globals.css` only declares `font-family: Inter` as a plain CSS fallback, and **Outfit isn't loaded at all**. This is folded into scope rather than treated as a separate design bug, since fixing it is itself a font-loading-performance improvement (self-hosting via `next/font/google` eliminates the external Google Fonts request and layout shift that a `<link>`-based approach would otherwise introduce).

**Goal:** cover the concrete low-hanging-fruit performance issues found in recon — no fixed numeric target (e.g. "Lighthouse 90+"), improvement is measured before/after with Lighthouse rather than chased to a specific score.

**Scope:** both the marketing site (`app/(marketing)/**`) and the portal (`app/portal/**`).

## Recon findings (baseline, from initial exploration)

1. **Fonts**: no `next/font` usage anywhere; Outfit never loaded; Inter is a CSS-fallback declaration only, no preload/optimization.
2. **Images**: only 2 non-`design-system`, non-optimized `<img>` tags remain in the marketing site — the Navbar brand logo and the Google review avatars in `HeroGoogleReviewRotator.tsx`. Everything else already uses `next/image`'s `<Image>` correctly. `next.config.ts` already has `remotePatterns` covering the external Google avatar domain.
3. **Bundle**: no `@next/bundle-analyzer` configured; no obviously heavy dependencies found in a first pass (no moment.js, no full lodash import, no chart libraries in marketing-facing code).
4. **Monitoring**: `@vercel/analytics` and `@vercel/speed-insights` are already installed and wired into `app/layout.tsx` (gated behind `VERCEL === "1"`), so production Web Vitals data already exists — this project doesn't need to add monitoring, just act on the static/structural issues.
5. **Marketing homepage**: 15 components, 12 of them `"use client"`. Of those, `InfoBar`, `Hero`, and `CampaignCarousel` look like real conversion candidates (no client-only state/effects that require it — `CampaignCarousel` already does its data fetch server-side). The rest (`BookingForm`, `SpecialistsSlider`, `Navbar`, `FAQSection`, `ContactSection`, `FloatingActions`, `Services`) have genuine client-side state (scroll listeners, carousel logic, forms, client-side data fetching) and are not conversion candidates.
6. **Rendering strategy**: homepage already uses ISR (`revalidate = 300`), services pages `revalidate = 3600` — ISR/caching strategy itself is not part of this project's scope, it's already reasonable.

## Approach: two independent phases

Phase 1 is mechanical and low-risk (no behavior change, easily verified automatically). Phase 2 changes component rendering boundaries (client → server), which carries real risk of hydration mismatches or lost interactivity, so it's isolated with its own, more careful verification — this follows the "smaller, well-bounded units" principle rather than bundling a risky change inside a batch of safe ones. Each phase gets its own implementation plan (via `writing-plans`) and can ship independently.

## Phase 1 — Fonts, images, bundle visibility

**Fonts.** Replace the CSS-fallback `font-family: Inter` in `app/globals.css` with `next/font/google` loading for both Outfit and Inter in `app/layout.tsx`, exposed as CSS variables (Next's standard pattern — `variable: "--font-outfit"` / `"--font-inter"`) and referenced from Tailwind's font-family config / `globals.css`. `next/font/google` self-hosts the font files at build time (no runtime request to Google Fonts, no external-domain waterfall) and computes fallback-font metrics automatically to avoid layout shift (CLS) when the real font swaps in. Apply Outfit to headings and Inter to body per the existing CLAUDE.md typography rules — this is fixing an existing spec gap, not introducing a new design decision.

**Images.** Convert the Navbar brand logo and `HeroGoogleReviewRotator`'s review-avatar `<img>` tags to `next/image`'s `<Image>`, matching the pattern already used correctly elsewhere in the codebase (`Hero.tsx`, `SpecialistsSlider.tsx`, `CampaignCarousel.tsx` — explicit dimensions or `fill` + `sizes`). The avatar images already have a working `remotePatterns` entry for their external host, confirmed in recon — no `next.config.ts` change needed there.

**Bundle analyzer.** Add `@next/bundle-analyzer` as a dev dependency, wire it into `next.config.ts` behind an `ANALYZE=true` env-var check (standard pattern — wraps the exported config, inert unless the env var is set, zero runtime cost), add an `analyze` script to `package.json`. Run it once as part of this phase's verification to report what's actually contributing to bundle size — Phase 1 only measures and reports here, it doesn't act on dependency-level findings (that's out of scope unless something alarming turns up, in which case it gets flagged as a follow-up, not silently fixed mid-phase).

## Phase 2 — Client → server component conversion

Convert `InfoBar`, `Hero`, and `CampaignCarousel` from `"use client"` to server components, following the pattern `CampaignCarousel` already partially demonstrates (server-side data fetch). For each: remove the `"use client"` directive, verify no client-only APIs remain (no `useState`/`useEffect`/event handlers/browser globals), and confirm any data currently fetched client-side moves to a server-side fetch (parent page/layout passing props, or the component doing its own server fetch) without changing what's rendered.

Do the same review pass across `app/portal/**`, but treat it as an audit rather than a guaranteed conversion list — portal dashboards are inherently interactive (live data, user actions), so real candidates are expected to be few or none. Report findings before converting anything there.

This phase is done one component at a time, not batched — each conversion is verified individually (dev server, load the affected page, visually confirm no regression) before moving to the next, so a problem in one component doesn't get buried under simultaneous changes to three others.

## Verification

**Every phase:**
```
pnpm run build && pnpm run typecheck --pretty false && pnpm run lint && DATABASE_URL="file:./prisma/dev.db" pnpm run test
```

**Additionally:**
- Lighthouse against a production build (`next build && next start`, not `next dev` — dev mode doesn't reflect real performance characteristics) run once as a baseline before Phase 1 starts, then again after each phase, comparing FCP/LCP/CLS and bundle size to confirm measurable improvement (or at minimum, no regression) rather than assuming the changes helped.
- Phase 2 specifically: manually load every converted page/component in a browser via the dev server and confirm it renders and behaves identically before considering that component's conversion done — this is not something the automated test suite reliably catches (hydration mismatches often don't fail tests but do fail visually/in the console).

## Out of scope (explicitly, not forgotten)
- No fixed Lighthouse/PageSpeed score target — success is "measurably better, no regressions," not a number.
- No caching/ISR strategy changes — current `revalidate` settings are already reasonable per recon.
- No dependency removal/replacement based on bundle analyzer findings unless something alarming turns up (flagged as follow-up, not fixed inline).
- UI polish (matching `design-system/` more closely) and visual redesign are separate, already-deferred sub-projects — not touched here even where they might overlap visually with a converted component.
