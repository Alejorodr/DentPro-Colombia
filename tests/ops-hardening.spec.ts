import { beforeEach, describe, expect, it, vi } from "vitest";

import { isValidOpsKey } from "@/app/api/ops/_utils";

const mockSpecialtyUpsert = vi.fn();
const mockGetPrismaClient = vi.fn(() => ({
  specialty: { upsert: mockSpecialtyUpsert },
}));

const mockIsOpsIpAllowed = vi.fn(() => true);
const mockEnforceOpsRateLimit = vi.fn(async () => null);
const mockGetOpsKey = vi.fn(() => "ops-secret");
const mockIsValidOpsKey = vi.fn((header: string | null | undefined, opsKey: string | null) => header === opsKey);

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => mockGetPrismaClient(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/scheduling/slot-inventory", () => ({
  refreshFutureInventoryForProfessional: vi.fn(),
}));

vi.mock("@/app/api/ops/_utils", async () => {
  const actual = await vi.importActual<typeof import("@/app/api/ops/_utils")>("@/app/api/ops/_utils");
  return {
    ...actual,
    isOpsIpAllowed: (...args: unknown[]) => mockIsOpsIpAllowed(...args),
    enforceOpsRateLimit: (...args: unknown[]) => mockEnforceOpsRateLimit(...args),
    getOpsKey: () => mockGetOpsKey(),
    isValidOpsKey: (header: string | null | undefined, opsKey: string | null) => mockIsValidOpsKey(header, opsKey),
    respondUnauthorized: () => new Response(JSON.stringify({ error: "Operación no autorizada." }), { status: 403 }),
  };
});

import { POST as seedTestRoute } from "@/app/api/test/seed/route";

describe("ops key comparison hardening", () => {
  it("validates exact key matches", () => {
    expect(isValidOpsKey("abc123", "abc123")).toBe(true);
    expect(isValidOpsKey("abc123", "abc1234")).toBe(false);
    expect(isValidOpsKey(null, "abc123")).toBe(false);
  });
});

describe("/api/test/seed hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("RUN_E2E", "1");
    vi.stubEnv("VERCEL", "0");
    vi.stubEnv("NODE_ENV", "test");
    mockIsOpsIpAllowed.mockReturnValue(true);
    mockEnforceOpsRateLimit.mockResolvedValue(null);
    mockGetOpsKey.mockReturnValue("ops-secret");
    mockIsValidOpsKey.mockImplementation((header, opsKey) => header === opsKey);
  });

  it("blocks requests from non-allowlisted IPs before touching DB", async () => {
    mockIsOpsIpAllowed.mockReturnValue(false);

    const response = await seedTestRoute(
      new Request("http://localhost/api/test/seed", { method: "POST", headers: { "x-ops-key": "ops-secret" } }),
    );

    expect(response.status).toBe(403);
    expect(mockGetPrismaClient).not.toHaveBeenCalled();
  });

  it("blocks invalid ops key before touching DB", async () => {
    const response = await seedTestRoute(
      new Request("http://localhost/api/test/seed", { method: "POST", headers: { "x-ops-key": "bad" } }),
    );

    expect(response.status).toBe(403);
    expect(mockGetPrismaClient).not.toHaveBeenCalled();
  });

  it("does not leak sensitive error details in 500 responses", async () => {
    mockSpecialtyUpsert.mockRejectedValueOnce(new Error("Sensitive DB detail should not leak"));

    const response = await seedTestRoute(
      new Request("http://localhost/api/test/seed", { method: "POST", headers: { "x-ops-key": "ops-secret" } }),
    );

    expect(response.status).toBe(500);
    const payload = await response.json();
    expect(payload).toEqual({ error: "Seed failed." });
    expect(JSON.stringify(payload)).not.toContain("Sensitive DB detail");
  });
});
