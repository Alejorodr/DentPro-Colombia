# Runbook: Incidentes

## Objetivo
Responder rápidamente a incidentes operativos sin detener la clínica.

## Niveles de severidad
- **Sev 1**: caída completa de agenda o autenticación.
- **Sev 2**: fallas en notificaciones o métricas.
- **Sev 3**: errores menores de UI/UX.

## Checklist inicial
1. Verificar despliegue en Vercel y últimos logs.
2. Validar conectividad a Neon (`DATABASE_URL`).
3. Confirmar variables críticas (`SMTP_*`, `EMAIL_FROM`, `CRON_SECRET`).

## Mitigaciones rápidas
- **Emails fallando**: la app debe continuar; revisar credenciales SMTP y configurar.
- **Agenda sin slots**: regenerar slots o revisar bloqueos.
- **Cron recordatorios**: ejecutar manualmente `/api/cron/appointments/reminders` con `CRON_SECRET`.

## Observabilidad
- Usar logs estructurados (`event`) para filtrar:
  - `appointment.create_failed`
  - `appointment.reschedule.failed`
  - `email.send.failed`
  - `cron.reminders.completed`

## Post-mortem básico
- Fecha y duración
- Impacto
- Causa raíz
- Acciones preventivas

