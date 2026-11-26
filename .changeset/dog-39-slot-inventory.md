---
"dentpro-colombia": patch
---

Reservas más estables (DOG-39):

- Regenerar el inventario de horarios ya no borra y recrea los horarios libres que no cambiaron: conservan su ID. Antes, un paciente que elegía un horario mientras se regeneraba el inventario recibía "Slot no encontrado" (404).
- Si otra persona reserva el mismo horario un instante antes, la API responde 409 con "Ese horario acaba de ser reservado. Elige otro horario." en vez del genérico "No se pudo crear la cita.".
