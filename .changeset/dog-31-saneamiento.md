---
"dentpro-colombia": patch
---

Saneamiento del repositorio (DOG-31):
- Se borran 54 fuentes Inter estáticas sin uso (~18,6 MB), la carpeta `migrations/` de SQLite, las notas de Jules y el panel viejo `app/(dashboard)`, que capturaba cualquier URL de un solo segmento antes del 404.
- Se borra código muerto: exports, iconos y una función de analytics que nadie usa. Los símbolos que solo se usan dentro de su archivo dejan de exportarse.
- Documentación: los reportes de seguridad de agosto quedan resumidos en `docs/security/HISTORIAL.md`, se borran los planes ya ejecutados, se unen los runbooks de backup y se actualizan README, E2E, deploy y CLAUDE.md.
