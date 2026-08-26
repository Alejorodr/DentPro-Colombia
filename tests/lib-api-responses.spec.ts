import { describe, expect, it } from "vitest";

import { getCollectionItems } from "@/lib/api/responses";

describe("getCollectionItems", () => {
  it("keeps legacy array responses compatible", () => {
    const items = [{ id: "one" }, { id: "two" }];

    expect(getCollectionItems(items)).toEqual(items);
  });

  it("unwraps paginated API responses", () => {
    const items = [{ id: "one" }];

    expect(
      getCollectionItems({
        items,
        data: [],
        page: 1,
        pageSize: 25,
        total: 1,
        totalPages: 1,
      }),
    ).toEqual(items);
  });

  it("falls back to data for older paginated consumers", () => {
    const data = [{ id: "fallback" }];

    expect(getCollectionItems({ data })).toEqual(data);
  });
});
