---
name: dentpro-design
description: Use this skill to generate well-branded interfaces and assets for DentPro Colombia (a specialized dental clinic in Chía, Cundinamarca), either for production or throwaway prototypes/mocks/landing-page tests/decks. Contains essential design guidelines, color tokens, type system, Phosphor icon usage, brand logos, and UI kit components for the public marketing site and the multi-role clinical portal.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, marketing pages, etc), copy the brand logos out of `assets/`, link `colors_and_type.css`, follow the Spanish (Colombia) tú-form voice guidelines from README.md, and use Phosphor icons via the project's `Icon.tsx` barrel (or the CDN fallback). Create static HTML files for the user to view.

If working on production code in the DentPro Next.js codebase, copy assets as needed and read the rules here to become an expert in designing with this brand — the system mirrors the codebase's own Tailwind tokens and custom utility classes.

If the user invokes this skill without any other guidance, ask them what they want to build or design — landing page section? portal screen? campaign card? deck? — ask 2-3 clarifying questions, then act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

Key things to remember and never violate:
- Single-hue blue palette. No greens, no purples, no warm accents. Gold appears only in print logos, never in UI.
- Spanish (Colombia), tú-form, sentence case. No emoji ever. CTAs are verbs ("Agenda", "Ver", "Reservar").
- The signature card is `rounded-[1.75rem]` (28px) with translucent white fill, soft border, large diffused shadow, hover lift.
- Phosphor icons with `weight="bold"` or `weight="fill"`. Wrap them in icon-badge / icon-circle containers when standalone.
- The booking form panel is the ONLY full-saturation gradient surface — everything else is white or pale blue.
- Use logos from `assets/logo-full-color.png` (web) or `assets/logo-on-navy.jpg` (when on dark surfaces).

The `ui_kits/` folder contains pixel-accurate JSX recreations of the two products (marketing + portal) — read those when building anything multi-component, rather than starting from scratch.
