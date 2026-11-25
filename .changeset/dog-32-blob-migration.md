---
"dentpro-colombia": patch
---

Los adjuntos clínicos nuevos se guardan bajo `clinical-private/`. El script de migración de adjuntos viejos ahora verifica cuáles están realmente expuestos (URL legible sin credenciales) y solo migra esos; antes contaba como viejos los adjuntos privados recientes y abortaba al intentar descargarlos sin credenciales (DOG-32).
