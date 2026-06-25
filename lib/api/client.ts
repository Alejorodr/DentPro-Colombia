export interface ApiError extends Error {
  status?: number;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Error ${response.status}`;

    try {
      const payload = await response.json();
      if (typeof payload?.error === "string" && payload.error.trim().length > 0) {
        message = payload.error;
      } else if (typeof payload?.message === "string" && payload.message.trim().length > 0) {
        message = payload.message;
      }
    } catch (error) {
      // No-op: use default message
    }

    const apiError = new Error(message) as ApiError;
    apiError.status = response.status;
    throw apiError;
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { skipAuth?: boolean },
): Promise<T> {
  const url = path.startsWith("http") ? path : `/api/${path}`;
  const { skipAuth, ...requestInit } = init ?? {};
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...requestInit.headers,
  };

  const response = await fetch(url, {
    ...requestInit,
    headers,
    cache: "no-store",
    credentials: skipAuth ? "omit" : "include",
  });

  return handleResponse<T>(response);
}
