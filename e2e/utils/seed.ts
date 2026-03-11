import { type APIRequestContext } from "@playwright/test";

type SeedAttemptResult = {
  path: string;
  status: number;
  body: string;
};

async function readResponseBody(response: Awaited<ReturnType<APIRequestContext["post"]>>): Promise<string> {
  try {
    const json = await response.json();
    return JSON.stringify(json);
  } catch {
    try {
      const text = await response.text();
      return text || "<empty body>";
    } catch {
      return "<unable to read body>";
    }
  }
}

async function trySeed(request: APIRequestContext, path: string): Promise<SeedAttemptResult> {
  const response =
    path === "/api/ops/seed-admin"
      ? await request.post(path, {
          headers: { "x-ops-key": process.env.OPS_KEY ?? "ops-test-key" },
        })
      : await request.post(path);

  return {
    path,
    status: response.status(),
    body: await readResponseBody(response),
  };
}

export async function seedTestData(request: APIRequestContext) {
  const adminSeed = await trySeed(request, "/api/ops/seed-admin");

  if (adminSeed.status >= 200 && adminSeed.status < 300) {
    return;
  }

  const fallbackSeed = await trySeed(request, "/api/test/seed");
  if (fallbackSeed.status >= 200 && fallbackSeed.status < 300) {
    return;
  }

  throw new Error(
    [
      `Seed admin failed: route ${adminSeed.path}, status ${adminSeed.status}, body ${adminSeed.body}`,
      `Fallback seed failed: route ${fallbackSeed.path}, status ${fallbackSeed.status}, body ${fallbackSeed.body}`,
    ].join("\n"),
  );
}
