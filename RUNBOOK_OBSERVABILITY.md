# Runbook: Observabilidad (Sentry + Logs)

## Objetivo
Capturar errores reales en producción sin exponer PII ni secretos, y contar con logs estructurados con `requestId` para facilitar trazabilidad.

## Variables de entorno (Vercel)
Los eventos van al proyecto `dentpro-colombia` (plataforma Next.js) de la organización `dogbyte` en Sentry (https://dogbyte.sentry.io, DOG-69). Variables en Production y Preview:

- `SENTRY_DSN`: DSN del proyecto (`sentry dsn list dogbyte/dentpro-colombia`). El servidor y el edge lo leen en `lib/monitoring/sentry-dsn.ts`. El cliente no se instrumenta.
- `SENTRY_ENVIRONMENT`: `production` en Production y `preview` en Preview.
- `MONITORING_TEST_TOKEN`: habilita la prueba controlada. La copia local vive en `~/.dentpro/monitoring.env`, fuera del repo.
- Opcionales: `SENTRY_TRACES_SAMPLE_RATE` (por defecto `0.05`), `LOG_LEVEL` (`info` o `warn`).

> No se usa la integración de Sentry del Marketplace de Vercel: crea una organización administrada por Vercel que la CLI y la API de la cuenta no ven, así que no se pueden verificar los eventos. Si alguien la vuelve a conectar, su `NEXT_PUBLIC_SENTRY_DSN` solo se usa cuando falta `SENTRY_DSN`. Sin ningún DSN, Sentry queda apagado (local y E2E).

## Activación paso a paso (Vercel)
1. Crear o confirmar el proyecto en Sentry: `sentry project view dogbyte/dentpro-colombia`.
2. Cargar `SENTRY_DSN`, `SENTRY_ENVIRONMENT` y `MONITORING_TEST_TOKEN` en Production y Preview.
3. Desplegar nuevamente. Las variables solo aplican a deploys nuevos.
4. Verificar con la prueba controlada (abajo) y `sentry issue list dogbyte/dentpro-colombia --period 1h` que el evento aparece en Sentry.

## Logs estructurados
Los logs en API usan JSON con:
- `timestamp`, `level`, `msg`
- `route`, `userId`, `requestId`
- `durationMs` y `status` cuando aplica

El `requestId` se genera en middleware y se propaga en `x-request-id` en cada respuesta.

### Auditoría clínica
Además de los logs de aplicación, las acciones clínicas generan registros en `AccessLog`:
- Lectura, creación y actualización de episodios clínicos.
- Descarga de adjuntos clínicos.
- Impresión/exportación de resúmenes y recetas.

Estos registros se consultan desde `/portal/admin/audit` o `GET /api/admin/audit/access-logs`.

Si falla la persistencia del `AccessLog`, ahora se emite log estructurado con:
- `event=clinical.access_log.write_failed`
- `route`, `requestId`, `userId`, `action`, `patientId`
- error sanitizado por `lib/logger.ts` (sin exponer secrets/headers/cookies)

## Checklist de verificación
- [ ] En desarrollo, dispara un error controlado: `GET /api/monitoring?error=1` con el header `x-monitoring-test-token`.
- [ ] Verifica que el evento aparece en Sentry (`sentry issue list dogbyte/dentpro-colombia --period 1h`).
- [ ] Verifica que los logs incluyen `requestId` y no exponen datos sensibles.

## Buenas prácticas
- No loggear `DATABASE_URL` ni tokens.
- No imprimir headers completos ni body en endpoints sensibles.
- Mantener `sendDefaultPii=false` en Sentry.
