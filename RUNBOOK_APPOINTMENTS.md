# Runbook: Agenda y Turnos

## Objetivo
Mantener la agenda operativa con buffers, bloqueos manuales, feriados y reprogramaciones con sugerencias.

## Parámetros clave
- `APPOINTMENT_BUFFER_MINUTES` (default 10): tiempo de buffer entre turnos.

## Flujos
- **Crear turno**: POST `/api/appointments`
- **Reprogramar**: POST `/api/appointments/[id]/reschedule`
- **Cancelar**: DELETE `/api/appointments/[id]`
- **Slots**: GET `/api/slots?date=YYYY-MM-DD`

## Reglas
- Buffer obligatorio entre turnos.
- Bloqueos manuales y feriados se respetan en la disponibilidad.
- Reprogramación valida conflictos y sugiere próximos slots.

## Troubleshooting
1. **No hay slots disponibles**
   - Verificar disponibilidad del profesional y slots generados.
   - Confirmar bloqueos/feriados en `/api/professional/availability` y `/api/admin/holidays`.
   - Validar `APPOINTMENT_BUFFER_MINUTES` si los slots quedan muy espaciados.

2. **Reprogramación con conflicto**
   - Revisar respuesta 409 y lista `suggestions`.
   - Verificar solapamientos con bloqueos manuales.

3. **Solapamientos en disponibilidad**
   - Los bloqueos manuales no deben solaparse.
   - Las excepciones por fecha no pueden repetirse.

