import { type APIRequestContext } from "@playwright/test";

type SeedAttemptResult = {
  path: string;
  status: number;
  body: string;
  contentType: string;
  json: unknown;
};

export type SeededRoleUser = {
  id: string;
  email: string;
  role: "ADMINISTRADOR" | "RECEPCIONISTA" | "PACIENTE" | "PROFESIONAL";
};

export type SeededUsersByRole = Partial<Record<SeededRoleUser["role"], SeededRoleUser>>;

function parseSeededUsers(payload: unknown): SeededUsersByRole {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const users = (payload as { users?: unknown }).users;
  if (!users || typeof users !== "object") {
    return {};
  }

  const roles = ["ADMINISTRADOR", "RECEPCIONISTA", "PACIENTE", "PROFESIONAL"] as const;
  const seeded: SeededUsersByRole = {};

  for (const role of roles) {
    const candidate = (users as Record<string, unknown>)[role];
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const id = (candidate as { id?: unknown }).id;
    const email = (candidate as { email?: unknown }).email;
    const payloadRole = (candidate as { role?: unknown }).role;

    if (typeof id === "string" && typeof email === "string" && payloadRole === role) {
      seeded[role] = { id, email, role };
    }
  }

  return seeded;
}

async function readResponseBody(
  response: Awaited<ReturnType<APIRequestContext["post"]>>,
  parsedJson: unknown,
): Promise<string> {
  if (parsedJson !== null && parsedJson !== undefined) {
    return JSON.stringify(parsedJson);
  }

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
      : await request.post(path, {
          headers: { "x-ops-key": process.env.OPS_KEY ?? "ops-test-key" },
        });

  let json: unknown = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  return {
    path,
    status: response.status(),
    body: await readResponseBody(response, json),
    contentType: response.headers()["content-type"] ?? "<missing>",
    json,
  };
}

export async function seedTestData(request: APIRequestContext) {
  const adminSeed = await trySeed(request, "/api/ops/seed-admin");

  if (adminSeed.status >= 200 && adminSeed.status < 300) {
    return parseSeededUsers(adminSeed.json);
  }

  const fallbackSeed = await trySeed(request, "/api/test/seed");
  if (fallbackSeed.status >= 200 && fallbackSeed.status < 300) {
    return parseSeededUsers(fallbackSeed.json);
  }

  const diagnostics = [
    `Seed admin failed: route ${adminSeed.path}, status ${adminSeed.status}, content-type ${adminSeed.contentType}, body ${adminSeed.body}`,
    `Fallback seed failed: route ${fallbackSeed.path}, status ${fallbackSeed.status}, content-type ${fallbackSeed.contentType}, body ${fallbackSeed.body}`,
  ];

  const combinedBody = `${adminSeed.body}\n${fallbackSeed.body}`;
  if (combinedBody.includes("P2021")) {
    diagnostics.push(
      "Database schema not initialized for E2E runtime. Required tables not found.",
    );
  }

  diagnostics.push("Hint: if status is 404 on both routes, verify middleware matchers and runtime env guards.");

  throw new Error(diagnostics.join("\n"));
}
