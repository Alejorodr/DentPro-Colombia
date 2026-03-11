# E2E en DentPro (P9)

## Modos
- `pnpm run e2e` mantiene compatibilidad local (`RUN_E2E=1` para ejecutar navegador).
- `pnpm run e2e:smoke` ejecuta solo pruebas etiquetadas `@smoke`.
- `pnpm run e2e:full` ejecuta la suite completa.

## Variables clave
- `RUN_E2E=1`: habilita ejecución real.
- `E2E_SUITE=smoke|full`: selecciona subconjunto desde `scripts/run-e2e.mjs`.
- `OPS_KEY`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`: usadas por el seed de entorno de prueba.

## Datos de prueba
Los flujos E2E usan `e2e/utils/fixtures.ts`, que prepara:
1. Seed reutilizable (`seedTestData`).
2. Sesión por rol (`seedRoleSession`).
3. Apertura de portal por rol.
