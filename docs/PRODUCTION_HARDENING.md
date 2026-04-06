# Production hardening baseline

## Objetivo de esta ronda
Este documento deja explícitas decisiones de hardening para evitar regresiones entre **Vercel Production**, **Vercel Preview**, **CI/E2E** y **localhost**.

## Matriz de entornos

| Entorno | Detección | Cookies secure | Auth test bypass | Rate limit fallback |
|---|---|---|---|---|
| Vercel Production | `VERCEL_ENV=production` | Siempre habilitadas | No permitido | **No fallback** (requiere Upstash) |
| Vercel Preview | `VERCEL_ENV=preview` | Habilitadas por URL https | No permitido | warning informativo si falta Upstash |
| CI/E2E | `CI=true` + `RUN_E2E=1` | Permitidas inseguras solo en localhost | Permitido únicamente con `TEST_AUTH_BYPASS=1` y localhost | fallback in-memory para pruebas determinísticas |
| Localhost dev | sin `CI` ni `VERCEL_ENV` | No secure en `http://localhost` | Permitido solo en E2E | fallback in-memory |

## Warnings clasificados

### 1) Corregidos sin riesgo
- Warning ambiguo de auth sobre cookies seguras en ejecución controlada de CI/E2E.
  - Ahora solo se alerta fuera de `ci-e2e` y con texto específico por stage.
- Warning de rate limit indicando “disabled in production” cuando realmente era CI/E2E.
  - Ahora distingue por stage y evita mensaje engañoso.
- Warning de GitHub Actions por runtime Node 20 en actions.
  - Workflows migrados a `actions/checkout@v5` y `actions/setup-node@v5`.
- Warning de deprecación de runtime en `pnpm/action-setup@v4`.
  - Se eliminó la action y se pasó a bootstrap con Corepack basado en `package.json#packageManager`.
  - Comando aplicado en CI/nightly: `corepack prepare --activate "$(node -p \"require('./package.json').packageManager\")"`.
- Warning legado de runtime en `actions/cache@v4` (artifact previo).
  - Se removió el cache manual de `.next/cache` para evitar deuda de runtime de action.
  - Se mantiene cache de dependencias `pnpm` vía `actions/setup-node@v5`.
- Warnings npm `Unknown env config "verify-deps-before-run"` y `"_jsr-registry"` durante E2E.
  - El comando de web server de Playwright fue migrado de `npm run` a `pnpm run`.
  - `scripts/run-e2e.mjs` limpia esas variables de entorno antes de lanzar procesos hijos.

### 2) No corregible sin riesgo en esta ronda
- Warning de webpack `Critical dependency: the request of a dependency is an expression` asociado a `@sentry/*` / `@opentelemetry/*`.
  - Es comportamiento conocido de librerías de instrumentación en build-time.
  - Reescribir la integración podría degradar trazas o manejo de errores.

### 3) Aceptado y documentado
- El warning de Sentry/OTel se filtra en `next.config.ts` solo cuando coincide simultáneamente:
  1. mensaje de critical dependency
  2. módulo bajo `@sentry` o `@opentelemetry`
- Se mantiene tracing y captura de errores sin alterar flujos de negocio.

## Rutas canónicas de auth
- Login canónico: `/auth/login`
- Alias legado: `/login` (solo redirect)

## Smoke vs nightly
- **Smoke**: cobertura crítica mínima para validar deploy.
- **Full/nightly**: cobertura funcional completa.

Comandos:
- `pnpm run e2e:smoke`
- `pnpm run e2e:full`

## API response minimization (Phase 5A)

Endoints endurecidos para evitar sobreexposición por `include: { user: true }`:
- `GET/POST /api/appointments`
- `POST /api/client/appointments`
- `GET/POST /api/professionals`
- `GET /api/search`
- `GET /api/professional/profile`

Decisión aplicada:
- se reemplazaron `include` amplios por `select` explícitos de campos de usuario.
- se mantuvieron únicamente campos requeridos por UI, búsqueda y notificaciones (`id`, `name`, `lastName`, `email`, `role` según caso).

## Pendiente para Phase 5B (RBAC)
- Auditoría completa de permisos campo-a-campo por endpoint.
- Revisión de ámbitos administrativos (admin/reception/professional) fuera de hardening de respuesta.
