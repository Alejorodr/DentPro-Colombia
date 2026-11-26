# E2E en DentPro

## Correrlos en tu máquina (recomendado)
`scripts/e2e-local.mjs` levanta un Postgres efímero en Docker (`docker-compose.e2e.yml`, puerto 54329), deja en blanco las variables de `.env` y `.env.local` y corre Playwright contra un build de producción, igual que el CI.

- `pnpm e2e:local`: suite completa, igual que el Nightly.
- `pnpm e2e:local:smoke`: solo `@smoke`, igual que el CI de los PR.
- `pnpm e2e:local -- e2e/auth.spec.ts --repeat-each=3`: un spec puntual.
- `pnpm e2e:db:down`: baja el contenedor.

Nunca corras los E2E contra Neon (ni producción ni dev): siembran usuarios con contraseñas públicas. `scripts/e2e-db-guard.mjs` aborta si `DATABASE_URL` apunta a un host remoto.

## Suites (las que usa el CI)
- `pnpm run e2e`: si `RUN_E2E=1`, corre Playwright de verdad.
- `pnpm run e2e:smoke`: suite rápida (`@smoke`) para CI.
- `pnpm run e2e:full`: suite completa funcional.

## Requisitos de ejecución real
- Variables mínimas:
  - `RUN_E2E=1`
  - `TEST_AUTH_BYPASS=1` (solo CI/local; nunca producción real)
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


## Auth y ruta canónica
- Ruta canónica de login: `/auth/login` (`/login` queda como alias).
- El bypass E2E solo aplica en localhost/127.0.0.1 con `RUN_E2E=1` + `TEST_AUTH_BYPASS=1`.
