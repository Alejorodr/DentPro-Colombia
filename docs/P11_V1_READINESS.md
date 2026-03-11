# P11 — v1 production readiness (cierre)

## Alcance aplicado

- Feed de actividad con consultas centralizadas (`lib/activity/queryFeed.ts`) para avanzar hacia un patrón DB-friendly sin ruptura funcional.
- Trazabilidad API consistente con `requestId`, endpoint, duración y resultado en endpoints críticos de actividad/notificaciones/eventos.
- CI ajustado para usar explícitamente smoke E2E en pipeline principal y E2E full en workflow nightly separado.
- Hardening incremental de UX en Activity Feed y Notifications Bell (loading/error/empty + accesibilidad básica).
- Revisión de seguridad y performance en endpoints críticos con validación de parámetros y reducción de over-fetch.

## Próximo paso recomendado (P12)

1. Migrar Activity Feed a stream materializado/UNION SQL para paginación 100% en DB.
2. Añadir export de traces/métricas a backend externo (OTel/Sentry Performance/Datadog).
3. Implementar presupuesto de latencia por endpoint (SLO + alertas).
4. Completar batería E2E full con datos seed por rol para regresión clínica completa.
