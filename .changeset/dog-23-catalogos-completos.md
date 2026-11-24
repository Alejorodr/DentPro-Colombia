---
"dentpro-colombia": patch
---

Selectores de catálogo completos (DOG-23): los selectores de profesionales y servicios de recepción, reservas y agenda del admin ahora traen todas las páginas con `fetchAllPages`. Antes pedían una sola página y, por el tope de 50 del servidor, lo que pasara de 50 desaparecía sin aviso (incluso donde se pedía `pageSize=100`).
