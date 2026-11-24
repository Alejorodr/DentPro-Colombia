---
"dentpro-colombia": patch
---

Caché de catálogos (DOG-14): el home, las campañas activas, la lista de servicios y la de especialidades se leen de la caché de datos de Next en lugar de consultar la base en cada visita. Cualquier escritura en esos modelos invalida la caché al instante; además vence sola a los 5 minutos. No hizo falta Redis.
