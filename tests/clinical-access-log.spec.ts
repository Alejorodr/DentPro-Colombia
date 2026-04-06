import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccessLogAction } from "@prisma/client";
import { logClinicalAccess } from "@/lib/clinical/access-log";

const mockCreate = vi.fn();
const mockLoggerError = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => ({
    accessLog: {
      create: mockCreate,
    },
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}));

describe("logClinicalAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs structured errors when access-log persistence fails", async () => {
    const dbError = new Error("insert failed");
    mockCreate.mockRejectedValue(dbError);

    await logClinicalAccess({
      userId: "user-1",
      patientId: "patient-1",
      action: AccessLogAction.VIEW,
      route: "/api/clinical/patients/patient-1/episodes",
      requestId: "req-1",
    });

    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "clinical.access_log.write_failed",
        requestId: "req-1",
        userId: "user-1",
        patientId: "patient-1",
      }),
      "Failed to write clinical access log",
    );
  });
});
