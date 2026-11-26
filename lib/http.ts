const DEFAULT_TIMEOUT_MS = Number.parseInt(
  process.env.NEXT_PUBLIC_FETCH_TIMEOUT_MS ?? process.env.FETCH_TIMEOUT_MS ?? "8000",
  10,
);
const DEFAULT_RETRY_COUNT = Number.parseInt(process.env.FETCH_RETRY_COUNT ?? "2", 10);
const DEFAULT_RETRY_DELAY_MS = Number.parseInt(process.env.FETCH_RETRY_DELAY_MS ?? "250", 10);

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const RETRY_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

type RetryOptions = {
  retries?: number;
  delayMs?: number;
  shouldRetry?: (response: Response | null, error: unknown) => boolean;
};

type TimeoutOptions = {
  timeoutMs?: number;
};

type ApiErrorPayload = {
  error?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveTimeoutMs(timeoutMs?: number) {
  if (Number.isFinite(timeoutMs) && (timeoutMs ?? 0) > 0) {
    return timeoutMs as number;
  }
  if (Number.isFinite(DEFAULT_TIMEOUT_MS) && DEFAULT_TIMEOUT_MS > 0) {
    return DEFAULT_TIMEOUT_MS;
  }
  return 8000;
}

function isSafeMethod(method?: string) {
  return SAFE_METHODS.has((method ?? "GET").toUpperCase());
}

function shouldRetry(response: Response | null, error: unknown, retryCheck?: RetryOptions["shouldRetry"]) {
  if (retryCheck) {
    return retryCheck(response, error);
  }
  if (response) {
    return RETRY_STATUS_CODES.has(response.status);
  }
  return error instanceof Error && error.name === "AbortError";
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: TimeoutOptions = {},
): Promise<Response> {
  const controller = new AbortController();
  const timeoutMs = resolveTimeoutMs(options.timeoutMs);
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  // Si quien llama trae su propio signal (p. ej. para cancelar búsquedas viejas), se combina
  // con el del timeout en vez de reemplazarlo: antes el timeout se perdía en ese caso.
  const signal = init.signal
    ? typeof AbortSignal.any === "function"
      ? AbortSignal.any([init.signal, controller.signal])
      : init.signal
    : controller.signal;

  try {
    return await fetch(input, { ...init, signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Corre una operación de un SDK que acepta AbortSignal y la aborta si no responde a tiempo.
 * El temporizador se limpia en cuanto la operación resuelve, así no corta una descarga en curso.
 */
export async function withAbortTimeout<T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error(`Tiempo de espera agotado (${timeoutMs} ms).`)), timeoutMs);
  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: RetryOptions & TimeoutOptions = {},
): Promise<Response> {
  if (!isSafeMethod(init.method)) {
    return fetchWithTimeout(input, init, options);
  }

  const retries = Number.isFinite(options.retries) ? (options.retries as number) : DEFAULT_RETRY_COUNT;
  const delayMs = Number.isFinite(options.delayMs) ? (options.delayMs as number) : DEFAULT_RETRY_DELAY_MS;

  let attempt = 0;
  let lastError: unknown = null;

  while (attempt <= retries) {
    try {
      const response = await fetchWithTimeout(input, init, options);
      if (!shouldRetry(response, null, options.shouldRetry)) {
        return response;
      }
      lastError = null;
    } catch (error) {
      if (init.signal?.aborted) {
        throw error;
      }
      if (!shouldRetry(null, error, options.shouldRetry)) {
        throw error;
      }
      lastError = error;
    }

    attempt += 1;
    if (attempt > retries) {
      break;
    }
    if (delayMs > 0) {
      await sleep(delayMs * Math.max(1, attempt));
    }
  }

  if (lastError) {
    throw lastError;
  }
  return fetchWithTimeout(input, init, options);
}

type PaginatedPayload<T> = { data?: T[]; totalPages?: number };

/** Tope del servidor por página (app/api/_utils/pagination.ts). */
const SERVER_MAX_PAGE_SIZE = 50;

/**
 * DOG-23: trae todas las páginas de un endpoint paginado. Sirve para selectores de
 * catálogo (profesionales, servicios), que antes pedían `pageSize=50` o `100` y, por el
 * tope de 50 del servidor, perdían en silencio todo lo que pasara de la primera página.
 *
 * Devuelve `null` si alguna página falla, para que quien llama conserve su estado.
 * `maxPages` acota el total (50 × 20 = 1.000 elementos) por si el catálogo se desborda.
 */
export async function fetchAllPages<T>(
  path: string,
  { maxPages = 20, init }: { maxPages?: number; init?: RequestInit } = {},
): Promise<T[] | null> {
  const url = new URL(path, "http://local.invalid");
  url.searchParams.set("pageSize", String(SERVER_MAX_PAGE_SIZE));
  const pagePath = (page: number) => {
    url.searchParams.set("page", String(page));
    return `${url.pathname}${url.search}`;
  };

  const readPage = async (page: number) => {
    const response = await fetchWithRetry(pagePath(page), init);
    if (!response.ok) return null;
    return (await response.json()) as PaginatedPayload<T>;
  };

  const first = await readPage(1);
  if (!first) return null;

  const lastPage = Math.min(first.totalPages ?? 1, maxPages);
  const rest = await Promise.all(Array.from({ length: Math.max(lastPage - 1, 0) }, (_, index) => readPage(index + 2)));
  if (rest.some((page) => page === null)) return null;

  return [first, ...(rest as PaginatedPayload<T>[])].flatMap((page) => page.data ?? []);
}

export async function getApiErrorMessage(response: Response, fallbackMessage: string) {
  const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
  return payload?.error ?? fallbackMessage;
}
