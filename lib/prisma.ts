import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
  var __prisma: PrismaClient | undefined;
  var __prismaPool: Pool | undefined;
}

let prismaClient: PrismaClient | null = null;

const PRISMA_QUERY_TIMEOUT_MS = Number.parseInt(process.env.PRISMA_QUERY_TIMEOUT_MS ?? "8000", 10);
const PRISMA_READ_RETRY_COUNT = Number.parseInt(process.env.PRISMA_READ_RETRY_COUNT ?? "1", 10);
const PRISMA_CIRCUIT_FAILURE_THRESHOLD = Number.parseInt(process.env.PRISMA_CIRCUIT_FAILURE_THRESHOLD ?? "3", 10);
const PRISMA_CIRCUIT_RESET_MS = Number.parseInt(process.env.PRISMA_CIRCUIT_RESET_MS ?? "30000", 10);
const PRISMA_FIND_MANY_TAKE_DEFAULT = Number.parseInt(process.env.PRISMA_FIND_MANY_TAKE_DEFAULT ?? "100", 10);

const READ_ACTIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

type CircuitState = {
  failures: number;
  openUntil: number | null;
  lastError: string | null;
};

const circuitState: CircuitState = {
  failures: 0,
  openUntil: null,
  lastError: null,
};

export class DatabaseCircuitOpenError extends Error {
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super("Base de datos temporalmente no disponible.");
    this.name = "DatabaseCircuitOpenError";
    this.retryAfterMs = retryAfterMs;
  }
}

class PrismaTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Prisma query exceeded ${timeoutMs}ms timeout.`);
    this.name = "PrismaTimeoutError";
  }
}

export function isDatabaseUnavailableError(error: unknown): error is DatabaseCircuitOpenError {
  return error instanceof DatabaseCircuitOpenError;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return promise;
  }

  let timeoutId: NodeJS.Timeout | null = null;
  return new Promise<T>((resolve, reject) => {
    timeoutId = setTimeout(() => reject(new PrismaTimeoutError(timeoutMs)), timeoutMs);
    promise
      .then((value) => resolve(value))
      .catch((error) => reject(error))
      .finally(() => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      });
  });
}

function isRetryablePrismaError(error: unknown) {
  if (error instanceof PrismaTimeoutError) {
    return true;
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return true;
  }
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return true;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const retryableCodes = new Set(["P1001", "P1002", "P1003", "P1008", "P1011", "P1017"]);
    return retryableCodes.has(error.code);
  }
  return false;
}

function isCircuitOpen() {
  if (!circuitState.openUntil) {
    return false;
  }
  if (Date.now() >= circuitState.openUntil) {
    circuitState.failures = 0;
    circuitState.openUntil = null;
    circuitState.lastError = null;
    return false;
  }
  return true;
}

function recordSuccess() {
  circuitState.failures = 0;
  circuitState.openUntil = null;
  circuitState.lastError = null;
}

function recordFailure(error: unknown) {
  circuitState.failures += 1;
  if (error instanceof Error) {
    circuitState.lastError = error.message;
  }
  if (circuitState.failures >= PRISMA_CIRCUIT_FAILURE_THRESHOLD) {
    circuitState.openUntil = Date.now() + PRISMA_CIRCUIT_RESET_MS;
  }
}

async function withRetry<T>(operation: () => Promise<T>) {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      attempt += 1;
      if (!isRetryablePrismaError(error) || attempt > PRISMA_READ_RETRY_COUNT) {
        throw error;
      }
    }
  }
}

function makeClient(): PrismaClient {
  const pooledUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DATABASE_URL_UNPOOLED ?? pooledUrl;
  if (!pooledUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const selectedUrl = process.env.NODE_ENV === "production" ? pooledUrl : directUrl;
  if (!selectedUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const normalizedUrl = selectedUrl.toLowerCase();
  const isLocalhost =
    normalizedUrl.includes("localhost") ||
    normalizedUrl.includes("127.0.0.1") ||
    normalizedUrl.includes("[::1]");
  const isNeonHost = normalizedUrl.includes(".neon.tech") || normalizedUrl.includes("neon");
  const shouldRelaxTls = !isLocalhost && isNeonHost;

  const pool =
    globalThis.__prismaPool ??
    new Pool({
      connectionString: selectedUrl,
      ...(shouldRelaxTls ? { ssl: { rejectUnauthorized: false } } : {}),
    });
  const adapter = new PrismaPg(pool);

  globalThis.__prismaPool = pool;
  const client = new PrismaClient({ adapter });

  const extended = client.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, operation, query }) {
          if (isCircuitOpen()) {
            const retryAfter = circuitState.openUntil ? Math.max(circuitState.openUntil - Date.now(), 0) : 0;
            throw new DatabaseCircuitOpenError(retryAfter);
          }

          const nextArgs = { ...(args ?? {}) };
          if (operation === "findMany") {
            const findManyArgs = nextArgs as {
              take?: number;
              skip?: number;
              orderBy?: unknown;
            };
            if (findManyArgs.take === undefined) {
              findManyArgs.take = PRISMA_FIND_MANY_TAKE_DEFAULT;
            }
            if (findManyArgs.skip === undefined) {
              findManyArgs.skip = 0;
            }
            if (findManyArgs.orderBy === undefined) {
              findManyArgs.orderBy = { id: "desc" };
            }
          }

          const run = () => withTimeout(query(nextArgs), PRISMA_QUERY_TIMEOUT_MS);

          try {
            const result = READ_ACTIONS.has(operation) ? await withRetry(run) : await run();
            recordSuccess();
            return result;
          } catch (error) {
            if (isRetryablePrismaError(error)) {
              recordFailure(error);
            }
            throw error;
          }
        },
      },
    },
  });

  return extended as PrismaClient;
}

export function getPrismaClient(): PrismaClient {
  if (globalThis.__prisma) {
    return globalThis.__prisma;
  }

  if (!prismaClient) {
    prismaClient = makeClient();
  }

  if (process.env.NODE_ENV !== "production") {
    globalThis.__prisma = prismaClient;
  }

  return prismaClient;
}

export function __resetPrismaClientForTests() {
  if (globalThis.__prisma) {
    void globalThis.__prisma.$disconnect().catch(() => {
      /* noop */
    });
  }

  if (globalThis.__prismaPool) {
    void globalThis.__prismaPool.end().catch(() => {
      /* noop */
    });
  }

  delete globalThis.__prisma;
  delete globalThis.__prismaPool;
  prismaClient = null;
}

export { PrismaClient };
