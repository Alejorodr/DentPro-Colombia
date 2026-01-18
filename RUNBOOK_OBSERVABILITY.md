# Runbook: Observabilidad (Sentry + Logs)

## Objetivo
Capturar errores reales en producción sin exponer PII ni secretos, y contar con logs estructurados con `requestId` para facilitar trazabilidad.

## Variables de entorno (Vercel)
Configura las siguientes variables en Vercel:

**Obligatorias para habilitar Sentry**
- `SENTRY_DSN` (backend y edge)
- `NEXT_PUBLIC_SENTRY_DSN` (frontend, opcional si quieres eventos del cliente)
- `SENTRY_ENVIRONMENT=production`

**Opcionales (recomendadas si hay releases automáticos)**
- `SENTRY_AUTH_TOKEN` (solo CI/Release)
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_TRACES_SAMPLE_RATE` (ej. `0.05`)

> Nota: si `SENTRY_DSN` no está configurado, la integración queda desactivada automáticamente.

## Activación paso a paso (Vercel)
1. Ingresar al proyecto en Vercel → **Settings → Environment Variables**.
2. Agregar `SENTRY_DSN`, `SENTRY_ENVIRONMENT=production` y, si aplica, `NEXT_PUBLIC_SENTRY_DSN`.
3. (Opcional) Agregar `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` para releases automáticos en CI.
4. Desplegar nuevamente.

## Logs estructurados
Los logs en API usan JSON con:
- `timestamp`, `level`, `msg`
- `route`, `userId`, `requestId`
- `durationMs` y `status` cuando aplica

El `requestId` se genera en middleware y se propaga en `x-request-id` en cada respuesta.

## Checklist de verificación
- [ ] En desarrollo, dispara un error controlado: `GET /api/_monitoring?error=1`.
- [ ] Verifica que el evento aparece en Sentry (si `SENTRY_DSN` está configurado).
- [ ] Verifica que los logs incluyen `requestId` y no exponen datos sensibles.

## Buenas prácticas
- No loggear `DATABASE_URL` ni tokens.
- No imprimir headers completos ni body en endpoints sensibles.
- Mantener `sendDefaultPii=false` en Sentry.
