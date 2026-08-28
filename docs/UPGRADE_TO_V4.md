# Upgrade to Tailwind CSS v4 — completado

## Summary
- Migrated to Tailwind CSS v4 using `@tailwindcss/upgrade`.
- Consolidated Tailwind entrypoint to a single `@import "tailwindcss";` in `app/globals.css`.
- Added theme tokens via `@theme` and new custom variants to align with the v4 API.
- Updated PostCSS configuration to use `@tailwindcss/postcss`.

La migración está aplicada en `main` y validada con build, lint, typecheck y pruebas. Este documento queda como nota histórica; no contiene pasos pendientes.

## Referencia histórica
Los comandos originales fueron:
   ```bash
   pnpm add tailwindcss@latest @tailwindcss/postcss
   ```
2. Confirm Node.js >= 20 is used in local/CI environments.
3. Run a build to validate:
   ```bash
   pnpm run build
   ```

## Notes
- The legacy `tailwind.config.ts` was removed by the upgrade tool in favor of the CSS-first configuration.
- Continue centralizing design tokens in `app/globals.css` using `@theme` variables.
