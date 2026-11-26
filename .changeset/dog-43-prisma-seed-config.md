---
"dentpro-colombia": patch
---

`pnpm db:seed` vuelve a funcionar con Prisma 7: el comando del seed pasa a `prisma.config.ts` y corre con `tsx`, que resuelve los alias `@/...`. Se retira `ts-node`.
