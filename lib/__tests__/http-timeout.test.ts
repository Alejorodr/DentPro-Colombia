import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchWithTimeout, withAbortTimeout } from "@/lib/http";

/** fetch falso que solo termina cuando le abortan el signal. */
function hangingFetch() {
  return vi.fn(
    (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("fetchWithTimeout", () => {
  it("aborta por timeout aunque quien llama pase su propio signal", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", hangingFetch());
    const caller = new AbortController();

    const pending = fetchWithTimeout("/api/x", { signal: caller.signal }, { timeoutMs: 1000 });
    const assertion = expect(pending).rejects.toThrow(/Aborted/);
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(caller.signal.aborted).toBe(false);
  });

  it("también se cancela con el signal de quien llama", async () => {
    vi.stubGlobal("fetch", hangingFetch());
    const caller = new AbortController();

    const pending = fetchWithTimeout("/api/x", { signal: caller.signal }, { timeoutMs: 60_000 });
    caller.abort();
    await expect(pending).rejects.toThrow(/Aborted/);
  });
});

describe("withAbortTimeout", () => {
  it("aborta la operación si no responde a tiempo", async () => {
    vi.useFakeTimers();
    const pending = withAbortTimeout(
      (signal) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason))),
      500,
    );
    const assertion = expect(pending).rejects.toThrow(/500 ms/);
    await vi.advanceTimersByTimeAsync(500);
    await assertion;
  });

  it("no aborta después de resolver", async () => {
    let captured: AbortSignal | undefined;
    await withAbortTimeout(async (signal) => {
      captured = signal;
      return "ok";
    }, 10);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(captured?.aborted).toBe(false);
  });
});
