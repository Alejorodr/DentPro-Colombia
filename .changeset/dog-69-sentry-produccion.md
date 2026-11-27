---
"dentpro-colombia": patch
---

Sentry se activa con el DSN que inyecta la integración de Vercel (`NEXT_PUBLIC_SENTRY_DSN`) cuando no hay `SENTRY_DSN` (DOG-69). Así producción reporta errores sin copiar a mano una clave que la integración rota.
