import { beforeEach, describe, expect, it, vi } from "vitest";

const mockEnforceRateLimit = vi.fn();
const mockCreate = vi.fn();

vi.mock("@/app/api/_utils/ratelimit", () => ({ enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args) }));
vi.mock("@/lib/prisma", () => ({ getPrismaClient: () => ({ user: { create: mockCreate } }) }));

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockResolvedValue(null);
  });

  it("applies the registration rate limit", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    mockEnforceRateLimit.mockResolvedValue(new Response(null, { status: 429 }));

    const response = await POST(new Request("http://localhost/api/auth/register", { method: "POST", body: "{}" }));

    expect(response.status).toBe(429);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
