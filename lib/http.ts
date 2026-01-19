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
  const signal = init.signal ?? controller.signal;

  try {
    return await fetch(input, { ...init, signal });
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
