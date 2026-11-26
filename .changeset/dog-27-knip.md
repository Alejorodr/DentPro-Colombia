---
"dentpro-colombia": patch
---

Limpieza con knip (DOG-27): se borran 8 archivos sin ningún import (`ChartSpark`, `StatusDot`, `ReceptionistPanel`, `components/ui/Modal`, `lib/api/{client,index,patients}` y `lib/availability.ts`) y la dependencia `rrule`. Se agrega `knip.jsonc` con las excepciones justificadas para que las próximas corridas salgan limpias.
