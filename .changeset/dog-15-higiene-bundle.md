---
"dentpro-colombia": patch
---

Higiene del bundle (DOG-15): se quitan dependencias sin uso (`jose`, `pino`, `@types/bcryptjs`, `eslint-config-next`), las imágenes se sirven en AVIF con WebP de respaldo, y se borra código muerto (`/api/admin/metrics/appointments` y `app/portal/admin/_data/dashboard.ts`).
