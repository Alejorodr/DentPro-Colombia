import { beforeEach, describe, expect, it, vi } from "vitest";

const afterCallbacks: Array<() => unknown> = [];
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: (cb: () => unknown) => void afterCallbacks.push(cb) };
});

const prismaMock = {
  user: { findUnique: vi.fn() },
  passwordResetToken: { updateMany: vi.fn(), create: vi.fn() },
};
vi.mock("@/lib/prisma", () => ({ getPrismaClient: () => prismaMock }));
const sendMock = vi.fn();
vi.mock("@/lib/email/password-reset", () => ({ sendPasswordResetEmail: sendMock }));
vi.mock("@/app/api/_utils/ratelimit", () => ({ enforceRateLimit: vi.fn().mockResolvedValue(null) }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

function req(email: string) {
  return new Request("http://localhost/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

describe("forgot-password timing", () => {
  beforeEach(() => {
    afterCallbacks.length = 0;
    vi.clearAllMocks();
  });

  it("responds before touching the database or sending email", async () => {
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", email: "a@example.com" });
    const res = await POST(req("a@example.com"));
    expect(res.status).toBe(200);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
    expect(afterCallbacks).toHaveLength(1);

    await afterCallbacks[0]();
    expect(prismaMock.passwordResetToken.create).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("returns the same body for unknown emails and sends nothing", async () => {
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    prismaMock.user.findUnique.mockResolvedValue(null);
    const known = await (await POST(req("a@example.com"))).json();
    const unknown = await (await POST(req("nadie@example.com"))).json();
    expect(unknown).toEqual(known);
    for (const cb of afterCallbacks) await cb();
    expect(sendMock).not.toHaveBeenCalled();
  });
});
