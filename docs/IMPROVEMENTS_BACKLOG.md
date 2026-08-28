# Improvements Backlog

Estado: revisado el 2026-08-28. Los P0 y P1 de este documento ya fueron implementados y se conservan abajo como historial de cierre. Solo los P2 siguen siendo mejoras opcionales.

## Cerrado

- Guardas de endpoints operativos y diagnóstico de auth/env.
- Paridad Node 24 entre local, CI y Vercel.
- Smoke E2E contra pantalla en blanco.
- Telemetría configurable en CI.
- Warning de rate limit controlado y emitido una sola vez por proceso.

## Mejoras opcionales

## P2 — Performance / Tech Debt

1. **Paginación de catálogos en recepción**
   - Riesgo: bajo mientras los catálogos sigan siendo pequeños.
   - Impacto: medio cuando aumente el número de profesionales o especialidades.
   - Validación: paginación server-side o endpoint paginado con cobertura de UI.

2. **Segundo factor para roles privilegiados**
   - Riesgo: medio; actualmente el acceso depende de credenciales y controles de rol.
   - Impacto: alto para endurecer ADMINISTRADOR/PROFESIONAL.
   - Validación: flujo MFA completo, recuperación, auditoría y pruebas de autenticación.

3. **Evitar `prisma generate` redundante en install de Vercel**
   - Riesgo: bajo.
   - Impacto: medio (build más rápido y menos pasos duplicados).
   - Esfuerzo: bajo.
   - Validación: postinstall hace skip en `VERCEL=1`; `vercel-build` mantiene `prisma generate` como fuente de verdad.

4. **Matriz explícita de ownership por dominio**
   - Riesgo: bajo.
   - Impacto: medio (menos fricción de soporte y revisiones).
   - Esfuerzo: medio.
   - Validación: `docs/ARCHITECTURE_MAP.md` actualizado con responsables por módulo/flujo.

5. **Tests contractuales para APIs críticas por rol**
   - Riesgo: medio.
   - Impacto: medio-alto.
   - Esfuerzo: medio.
   - Validación: suite de integración por endpoint crítico (403/404/200 según rol y entorno).
