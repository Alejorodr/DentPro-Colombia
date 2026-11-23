import type { Pool, PoolClient } from "pg";

/**
 * Serializa las consultas de cada conexión de pg (DOG-9).
 *
 * El intérprete de consultas de Prisma 7 ejecuta con `Promise.all` los hijos de
 * los nodos `join`, `concat` y `sum` del plan. Dentro de una transacción todos
 * usan la misma conexión, y pg 8 encola esas consultas simultáneas con un
 * DeprecationWarning; pg 9 las rechazará con un error.
 *
 * Aquí las encolamos nosotros: mismo orden y misma semántica que la cola interna
 * de pg, sin el aviso y compatible con pg 9. Solo se serializan las llamadas con
 * promesa (las que usa @prisma/adapter-pg). Las de callback o con objetos
 * "submittable" (cursores, streams) pasan directo: `pool.query` usa callbacks
 * sobre una conexión que tiene en exclusiva, así que no compite con la cola.
 */
const SERIALIZED = Symbol.for("dentpro.pg.serializedQueries");

type QueryArgs = unknown[];
type SerializableClient = PoolClient & { [SERIALIZED]?: true };

export function serializeClientQueries(client: PoolClient): void {
  const target = client as SerializableClient;
  if (target[SERIALIZED]) return;
  target[SERIALIZED] = true;

  const original = client.query.bind(client) as (...args: QueryArgs) => unknown;
  let tail: Promise<unknown> = Promise.resolve();

  const serializedQuery = (...args: QueryArgs): unknown => {
    const usesCallback = typeof args[args.length - 1] === "function";
    const first = args[0] as { submit?: unknown } | undefined;
    const isSubmittable = typeof first?.submit === "function";
    if (usesCallback || isSubmittable) {
      return original(...args);
    }

    const run = tail.then(() => original(...args));
    // Un error en una consulta no debe bloquear las siguientes de la cola.
    tail = run.catch(() => undefined);
    return run;
  };

  (client as { query: unknown }).query = serializedQuery;
}

/** Aplica la serialización a cada conexión nueva del pool. */
export function serializePoolClientQueries<T extends Pool>(pool: T): T {
  pool.on("connect", serializeClientQueries);
  return pool;
}
