import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("marketing route exports", () => {
  it("keeps static revalidation export for the root page", () => {
    const pagePath = path.join(process.cwd(), "app", "page.tsx");
    const source = readFileSync(pagePath, "utf-8");
    expect(source).toMatch(/export const revalidate = 300;/);
    expect(source).not.toMatch(/export const dynamic = "force-dynamic";/);
  });
});
