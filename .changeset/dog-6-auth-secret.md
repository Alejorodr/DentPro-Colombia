---
"dentpro-colombia": patch
---

Seguridad (DOG-6): el secreto de autenticación se resuelve en un único helper (`lib/auth/secret.ts`) que trata las variables vacías como ausentes. Antes, un `AUTH_JWT_SECRET` definido pero vacío hacía que `proxy.ts` ignorara `NEXTAUTH_SECRET` y lanzara un error en todas las rutas protegidas en producción.
