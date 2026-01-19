# Runbook: Notificaciones

## Objetivo
Operar la capa de email transaccional para pacientes y staff con SMTP simple, evitando caídas de flujo cuando no hay configuración.

## Variables de entorno
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`
- `CRON_SECRET` (opcional, protege el cron de recordatorios)

## Verificaciones rápidas
1. **Chequeo de configuración**
   - Revisa que todas las variables SMTP estén presentes en Vercel.
   - `EMAIL_FROM` debe usar un dominio/alias válido del proveedor SMTP.

2. **Logs estructurados**
   - Eventos esperados:
     - `email.config.missing`: SMTP no configurado.
     - `email.send.failed`: error al enviar.
     - `appointment.email.failed`: fallos por destinatario.

## Flujos principales
- **Confirmación**: POST `/api/appointments`
- **Reprogramación**: POST `/api/appointments/[id]/reschedule`
- **Cancelación**: DELETE `/api/appointments/[id]` y PATCH cancelación
- **Recordatorios**: GET `/api/cron/appointments/reminders`

## Procedimiento ante fallas de envío
1. Busca el evento `email.send.failed` en logs y verifica el mensaje `reason`.
2. Valida credenciales SMTP y conectividad.
3. Ejecuta un envío manual desde un ambiente local con el mismo `EMAIL_FROM`.
4. Si no hay SMTP configurado, confirma que la app siga operando y agenda la configuración.

## Pruebas manuales rápidas
- Crear un turno como paciente y verificar que el email de confirmación se envía.
- Desactivar `emailEnabled` en `/api/users/me/notifications` y confirmar que no se envían emails.

## Pruebas manuales de citas (QA previo a producción)
1. **Crear cita (confirmación)**
   - Crear una cita nueva desde el portal y confirmar que el paciente y el profesional reciben el email de confirmación.
   - Verifica que el asunto contenga la fecha y el nombre del profesional.
2. **Reprogramar cita**
   - Usar la acción de reprogramación y confirmar que el email llega al mismo paciente con el nuevo horario.
   - Valida que el profesional también recibe el aviso actualizado.
3. **Cancelar cita**
   - Cancelar desde el portal o API y verificar que el email de cancelación llega al paciente correcto.
   - Confirmar que no se envía a usuarios con `emailEnabled=false`.
