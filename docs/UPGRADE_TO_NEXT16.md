# Upgrade to Next.js 16

## Summary
- Updated to Next.js 16 and React 19 (latest) and enabled Cache Components via `next.config.ts`.
- Renamed `middleware.ts` to `proxy.ts` and exported the default `proxy` handler.
- Removed route-segment `runtime`/`dynamic` exports that are incompatible with Cache Components.
- Wrapped global providers in a `<Suspense>` boundary to satisfy Cache Components prerendering rules.

## Required Actions
1. Install dependencies:
   ```bash
   npm install next@latest react@latest react-dom@latest
   npm install eslint-config-next@latest
   ```
2. Verify the `proxy.ts` configuration and matcher.
3. Ensure `DATABASE_URL` is available in build and runtime environments.
4. Run a build to validate:
   ```bash
   npm run build
   ```

## Notes
- If you need dynamic behavior in pages/routes, prefer `no-store`/`revalidate` patterns rather than `export const dynamic` when Cache Components is enabled.
- Use `next dev --turbo` to take advantage of Turbopack in local development.
