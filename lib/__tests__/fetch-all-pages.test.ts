import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchAllPages } from "@/lib/http";

type Item = { id: number };

/** API falsa con `total` elementos y el tope de 50 por página del servidor real. */
function paginatedApi(total: number, failPage?: number) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), "http://local.invalid");
    const page = Number(url.searchParams.get("page"));
    const pageSize = Math.min(Number(url.searchParams.get("pageSize")), 50);
    if (page === failPage) return new Response("{}", { status: 500 });
    const start = (page - 1) * pageSize;
    const data = Array.from({ length: Math.max(Math.min(pageSize, total - start), 0) }, (_, i) => ({ id: start + i }));
    return Response.json({ data, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("fetchAllPages", () => {
  it("junta todas las páginas en vez de quedarse con las primeras 50", async () => {
    const api = paginatedApi(120);
    vi.stubGlobal("fetch", api);

    const items = await fetchAllPages<Item>("/api/services?active=true");

    expect(items).toHaveLength(120);
    expect(items?.at(-1)).toEqual({ id: 119 });
    expect(api).toHaveBeenCalledTimes(3);
    expect(String(api.mock.calls[0][0])).toBe("/api/services?active=true&pageSize=50&page=1");
  });

  it("hace una sola llamada cuando cabe en una página", async () => {
    const api = paginatedApi(6);
    vi.stubGlobal("fetch", api);

    expect(await fetchAllPages<Item>("/api/professionals")).toHaveLength(6);
    expect(api).toHaveBeenCalledTimes(1);
  });

  it("devuelve null si falla cualquier página", async () => {
    vi.stubGlobal("fetch", paginatedApi(120, 2));
    expect(await fetchAllPages<Item>("/api/services", { init: {} })).toBeNull();
  });

  it("respeta el máximo de páginas", async () => {
    const api = paginatedApi(500);
    vi.stubGlobal("fetch", api);

    expect(await fetchAllPages<Item>("/api/services", { maxPages: 2 })).toHaveLength(100);
    expect(api).toHaveBeenCalledTimes(2);
  });
});
