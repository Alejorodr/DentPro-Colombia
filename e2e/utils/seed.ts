import { expect, type APIRequestContext } from "@playwright/test";

export async function seedTestData(request: APIRequestContext) {
  const response = await request.post("/api/ops/seed-admin", {
    headers: { "x-ops-key": process.env.OPS_KEY ?? "ops-test-key" },
  });

  if (response.ok()) {
    return;
  }

  const fallback = await request.post("/api/test/seed");
  expect(fallback.ok()).toBeTruthy();
}
