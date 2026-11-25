---
"dentpro-colombia": patch
---

Regenerar el inventario de horarios ya no borra y recrea los horarios libres que no cambiaron: conservan su ID. Antes, un paciente que elegía un horario mientras se regeneraba el inventario recibía "Slot no encontrado" (404) aunque el horario siguiera disponible (DOG-39).
