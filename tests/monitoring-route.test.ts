import { beforeEach, describe, expect, it, vi } from "vitest";

const { captureException } = vi.hoisted(() => ({ captureException: vi.fn() }));

vi.mock("@sentry/nextjs", () => ({ captureException }));

import { GET } from "@/app/api/_monitoring/route";

describe("monitoring test route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("does not expose the Sentry trigger without the internal token", async () => {
    vi.stubEnv("MONITORING_TEST_TOKEN", "monitoring-secret");

    const response = await GET(new Request("http://localhost/api/_monitoring?error=1"));

    expect(response.status).toBe(404);
    expect(captureException).not.toHaveBeenCalled();
  });

  it("accepts the controlled trigger only with the configured token", async () => {
    vi.stubEnv("MONITORING_TEST_TOKEN", "monitoring-secret");

    const response = await GET(
      new Request("http://localhost/api/_monitoring?error=1", {
        headers: { "x-monitoring-test-token": "monitoring-secret" },
      }),
    );

    expect(response.status).toBe(500);
    expect(captureException).toHaveBeenCalledOnce();
  });
});
