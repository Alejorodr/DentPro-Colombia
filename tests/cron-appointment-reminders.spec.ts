import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as runRemindersCron } from "@/app/api/cron/appointments/reminders/route";

const mockFindMany = vi.fn();
const mockUpdateMany = vi.fn();
const mockSendAppointmentEmail = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => ({
    appointment: {
      findMany: mockFindMany,
      updateMany: mockUpdateMany,
    },
  }),
}));

vi.mock("@/lib/notifications/email", () => ({
  sendAppointmentEmail: (...args: unknown[]) => mockSendAppointmentEmail(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe("cron appointment reminders", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = originalNodeEnv;
    if (originalCronSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalCronSecret;
    }
  });

  it("does not execute in protected environments when CRON_SECRET is missing", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.CRON_SECRET;

    const response = await runRemindersCron(new Request("http://localhost/api/cron/appointments/reminders"));
    expect(response.status).toBe(401);
    expect(mockFindMany).not.toHaveBeenCalled();
    expect(mockSendAppointmentEmail).not.toHaveBeenCalled();
  });

  it("executes when CRON_SECRET is configured and header is authorized", async () => {
    process.env.NODE_ENV = "production";
    process.env.CRON_SECRET = "secret-123";

    mockFindMany.mockResolvedValue([
      { id: "a1", status: "CONFIRMED", timeSlot: { startAt: new Date(), endAt: new Date() }, patient: null, professional: null },
    ]);
    mockSendAppointmentEmail.mockResolvedValue(true);
    mockUpdateMany.mockResolvedValueOnce({ count: 1 });

    const response = await runRemindersCron(
      new Request("http://localhost/api/cron/appointments/reminders", {
        headers: { authorization: "Bearer secret-123" },
      }),
    );
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toMatchObject({ processed: 1, sent: 1, skippedAlreadySent: 0, failed: 0 });
  });

  it("tracks sent reminders and skips already updated records", async () => {
    mockFindMany.mockResolvedValue([
      { id: "a1", status: "CONFIRMED", timeSlot: { startAt: new Date(), endAt: new Date() }, patient: null, professional: null },
      { id: "a2", status: "SCHEDULED", timeSlot: { startAt: new Date(), endAt: new Date() }, patient: null, professional: null },
    ]);
    mockSendAppointmentEmail.mockResolvedValue(true);
    mockUpdateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    const response = await runRemindersCron(new Request("http://localhost/api/cron/appointments/reminders"));
    expect(response.status).toBe(200);

    const payload = await response.json();
    expect(payload).toMatchObject({ processed: 2, sent: 1, skippedAlreadySent: 1, failed: 0 });
  });
});
