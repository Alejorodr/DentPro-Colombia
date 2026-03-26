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
