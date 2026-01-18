import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("marketing route exports", () => {
  it("keeps dynamic and revalidate exports for the root page", () => {
    const pagePath = path.join(process.cwd(), "app", "page.tsx");
    const source = readFileSync(pagePath, "utf-8");
    expect(source).toMatch(/export const dynamic = "force-dynamic";/);
    expect(source).toMatch(/export const revalidate = 0;/);
  });
});
