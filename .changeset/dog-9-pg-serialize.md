---
"dentpro-colombia": patch
---

Base de datos (DOG-9): las consultas de cada conexión de pg se serializan. El intérprete de Prisma 7 lanza en paralelo las subconsultas de `include` y lotes dentro de una transacción, que comparte una sola conexión; pg 8 las encolaba con un aviso de deprecación y pg 9 las rechazará con un error. Además, `pnpm e2e:local` ahora deja pasar `NODE_OPTIONS` para depurar.
