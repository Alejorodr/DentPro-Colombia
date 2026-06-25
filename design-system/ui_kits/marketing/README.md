# DentPro Marketing UI Kit

Recreation of the **public marketing site** from `app/(marketing)/` and `app/page.tsx` in the [DentPro-Colombia](https://github.com/Alejorodr/DentPro-Colombia) Next.js codebase. Pixel/structurally accurate, but with the production data inlined as defaults from `lib/marketing/homepage-defaults.ts`.

## Files

| File | Role | Mirrors in repo |
|---|---|---|
| `index.html` | Mounts the full single-page site | `app/page.tsx` |
| `styles.css` | Local CSS — `dp-*` classes that recreate the `@utility` blocks in `app/globals.css` | `app/globals.css` |
| `InfoBar.jsx` | Top utility bar with hours/location/socials | `InfoBar.tsx` |
| `Navbar.jsx` | Frosted sticky header, brand, links, login + CTA | `Navbar.tsx` |
| `Hero.jsx` | Two-column hero with stat grid + photo card + indicator chip | `Hero.tsx` |
| `Services.jsx` | 3×2 service card grid with icon-circle + checklist | `Services.tsx` |
| `Specialists.jsx` | Specialists carousel | `SpecialistsSlider.tsx` |
| `BookingForm.jsx` | Gradient booking panel + benefits sidebar | `BookingForm.tsx` |
| `Contact.jsx` | Contact channels, map placeholder, footer | `ContactSection.tsx` + footer |
| `LoginModal.jsx` | Split-panel login dialog + floating WhatsApp/phone buttons | `LoginModal.tsx` + `FloatingActions.tsx` |

## What's faithful, what's simplified

- **Faithful**: layout, colors, gradients, type scale, card radius, shadow system, Phosphor icon usage, Spanish tú-form copy, the exact 6 services with their highlight bullets, the gradient booking panel as the only saturated surface.
- **Simplified**: dynamic data fetching (Google reviews, slot availability) is mocked with the static defaults. Image-heavy bits (specialist headshots) use initial monograms over the brand gradient — the production app pulls Unsplash URLs that aren't appropriate to ship in a static mock.
- **Map** is a styled placeholder, not the real Google Maps embed.

## Running it

Open `ui_kits/marketing/index.html` directly. It needs no build step — React + Babel are loaded from unpkg.

## Extending it

If you add a new service or specialist, edit the arrays inline at the top of `Services.jsx` / `Specialists.jsx`. Keep voice in Spanish, tú-form, sentence case. Add new icons by importing them into `../_shared/Icons.jsx` from the Phosphor path data.

## Known font substitution

Inter is loaded from Google Fonts via `colors_and_type.css`. The production codebase declares `Inter` as `font-family` but doesn't ship a `.woff2`. If the brand owner has a different production font, drop it into `fonts/` and update `colors_and_type.css`.
