import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFindMany } = vi.hoisted(() => ({ mockFindMany: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => ({
    appointment: { findMany: mockFindMany, updateMany: vi.fn() },
  }),
}));

vi.mock("@/lib/notifications/email", () => ({ sendAppointmentEmail: vi.fn() }));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import { GET as runRemindersCron } from "@/app/api/cron/appointments/reminders/route";

const CRON_URL = "http://localhost/api/cron/appointments/reminders";

function call(headers: Record<string, string> = {}) {
  return runRemindersCron(new Request(CRON_URL, { headers }));
}

describe("cron reminders authorization (production)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "cron-secret-xyz");
    mockFindMany.mockResolvedValue([]);
  });

  it("accepts the correct Bearer secret", async () => {
    const response = await call({ authorization: "Bearer cron-secret-xyz" });
    expect(response.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledOnce();
  });

  it("accepts the correct x-cron-key", async () => {
    const response = await call({ "x-cron-key": "cron-secret-xyz" });
    expect(response.status).toBe(200);
  });

  it("rejects an incorrect Bearer secret", async () => {
    const response = await call({ authorization: "Bearer wrong-secret" });
    expect(response.status).toBe(401);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("rejects a Bearer secret with a different length", async () => {
    const response = await call({ authorization: "Bearer cron-secret-xyz-extra" });
    expect(response.status).toBe(401);
  });

  it("rejects an incorrect x-cron-key", async () => {
    const response = await call({ "x-cron-key": "cron-secret-xy" });
    expect(response.status).toBe(401);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("rejects an empty Bearer token", async () => {
    const response = await call({ authorization: "Bearer " });
    expect(response.status).toBe(401);
  });

  it("does not accept a lowercase bearer prefix", async () => {
    const response = await call({ authorization: "bearer cron-secret-xyz" });
    expect(response.status).toBe(401);
  });

  it("rejects requests with no credentials", async () => {
    const response = await call();
    expect(response.status).toBe(401);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("rejects everything when CRON_SECRET is missing in production", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const response = await call({ authorization: "Bearer " });
    expect(response.status).toBe(401);
    expect(mockFindMany).not.toHaveBeenCalled();
  });
});
