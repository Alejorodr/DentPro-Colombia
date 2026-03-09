# Improvements Backlog (priorizado)

## P0 — Seguridad / Fiabilidad

1. **Cobertura de guardas en endpoints operativos**
   - Riesgo: alto (ejecución accidental en prod).
   - Impacto: alto.
   - Esfuerzo: bajo.
   - Validación: tests de route handlers con `NODE_ENV=production` devolviendo 404 para `ops/test` sensibles.

2. **Diagnóstico auth/env operativo (sin exponer secretos)**
   - Riesgo: alto (incidentes de login por env mal configurado).
   - Impacto: alto.
   - Esfuerzo: bajo.
   - Validación: `GET /api/ops/auth-diagnostics` con `x-ops-key` devuelve booleans y recomendaciones, nunca secretos.

3. **Paridad de versión Node entre local/CI/Vercel**
   - Riesgo: medio-alto (builds no determinísticos).
   - Impacto: alto.
   - Esfuerzo: bajo.
   - Validación: `engines.node=24.x`, `.nvmrc=24`, CI con Node 24.x, build/lint/typecheck verdes.

## P1 — UX / Observabilidad

1. **Smoke e2e anti “pantalla en blanco”**
   - Riesgo: medio.
   - Impacto: alto (detecta regresión visible de forma temprana).
   - Esfuerzo: bajo.
   - Validación: Playwright falla si home no renderiza selector base, body vacío o hay `console/pageerror`.

2. **Telemetría Next.js configurable en CI**
   - Riesgo: bajo.
   - Impacto: medio (logs más limpios y menos ruido en pipelines).
   - Esfuerzo: bajo.
   - Validación: variable `NEXT_TELEMETRY_DISABLED=1` documentada y activa en CI/E2E prod-like.

3. **Warnings operativos de rate limit**
   - Riesgo: medio (creer que hay rate limit global cuando falta Upstash).
   - Impacto: medio.
   - Esfuerzo: bajo.
   - Validación: warning una sola vez por proceso en producción cuando faltan variables Upstash.

## P2 — Performance / Tech Debt

1. **Evitar `prisma generate` redundante en install de Vercel**
   - Riesgo: bajo.
   - Impacto: medio (build más rápido y menos pasos duplicados).
   - Esfuerzo: bajo.
   - Validación: postinstall hace skip en `VERCEL=1`; `vercel-build` mantiene `prisma generate` como fuente de verdad.

2. **Matriz explícita de ownership por dominio**
   - Riesgo: bajo.
   - Impacto: medio (menos fricción de soporte y revisiones).
   - Esfuerzo: medio.
   - Validación: `docs/ARCHITECTURE_MAP.md` actualizado con responsables por módulo/flujo.

3. **Tests contractuales para APIs críticas por rol**
   - Riesgo: medio.
   - Impacto: medio-alto.
   - Esfuerzo: medio.
   - Validación: suite de integración por endpoint crítico (403/404/200 según rol y entorno).
