---
"dentpro-colombia": patch
---

El contenido del sitio público se lee con consultas independientes en lugar de una transacción, que fallaba con "Unable to start a transaction in the given time" cuando la base tardaba en responder (build con muchos workers o Neon en frío). Las páginas de servicios ahora usan el contenido por defecto si la base no responde, igual que el home. También se corrige un test de cifrado intermitente.
