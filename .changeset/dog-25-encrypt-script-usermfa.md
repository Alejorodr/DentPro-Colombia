---
"dentpro-colombia": patch
---

El script `encrypt-existing-fields` ahora cifra también los secretos de verificación en dos pasos (`UserMfa`), cuya clave primaria es `userId` y no `id`. Antes fallaba al llegar a esa tabla.
