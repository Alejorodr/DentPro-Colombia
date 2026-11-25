---
"dentpro-colombia": patch
---

Auditoría de plataforma web (DOG-40). Los 12 modales del portal pasan a `<dialog>` nativo con `showModal()` a través de `PortalDialog`: foco atrapado, página inerte, Esc y retorno del foco los da el navegador, y desaparecen `useModalDialog` y los overlays `fixed inset-0` hechos a mano. Todas las fechas y horas de citas, registros, correos e impresiones se muestran en hora de Bogotá (`CLINIC_TIME_ZONE`) aunque se rendericen en el servidor de Vercel, que corre en UTC. Formularios: `autocomplete` correcto en login, registro y cambio de contraseña, labels asociados en cambio de contraseña y Enter del buscador global seguro con IME. `toSorted` y `Object.groupBy` en lugar de copias y reduce manuales. Política de soporte de navegadores en `CLAUDE.md`.
