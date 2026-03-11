# E2E en DentPro (P10)

## Suites disponibles
- `pnpm run e2e`: compatibilidad local (si `RUN_E2E=1` ejecuta Playwright real).
- `pnpm run e2e:smoke`: suite rápida (`@smoke`) para CI.
- `pnpm run e2e:full`: suite completa funcional.

## Requisitos de ejecución real
- Variables mínimas:
  - `RUN_E2E=1`
  - `OPS_KEY`
  - `SEED_ADMIN_EMAIL`
  - `SEED_ADMIN_PASSWORD`
- Browsers de Playwright: `scripts/run-e2e.mjs` instala Chromium automáticamente si no existe caché local.

## Datos de prueba y roles
`e2e/utils/fixtures.ts` garantiza seed reproducible y sesión por rol:
- ADMINISTRADOR
- RECEPCIONISTA
- PROFESIONAL
- PACIENTE

## Flujos críticos
- Flujo A: recepción confirma cita → aparece evento en Activity Feed.
- Flujo B: recepción reprograma → se visualizan notificaciones.
- Flujo C: paciente cancela → recepción visualiza el cambio.

## Recomendación CI
1. `pnpm install --frozen-lockfile`
2. `pnpm exec playwright install --with-deps chromium` (opcional, el script también lo cubre)
3. `RUN_E2E=1 E2E_SUITE=smoke pnpm run test:e2e`
4. `RUN_E2E=1 E2E_SUITE=full pnpm run test:e2e` (pipeline nocturno / previo a release)
