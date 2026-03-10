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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tracks sent reminders and skips already updated records", async () => {
    mockFindMany.mockResolvedValue([
      { id: "a1", status: "CONFIRMED", timeSlot: { startAt: new Date(), endAt: new Date() }, patient: null, professional: null },
      { id: "a2", status: "PENDING", timeSlot: { startAt: new Date(), endAt: new Date() }, patient: null, professional: null },
    ]);
    mockSendAppointmentEmail.mockResolvedValue(true);
    mockUpdateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    const response = await runRemindersCron(new Request("http://localhost/api/cron/appointments/reminders"));
    expect(response.status).toBe(200);

    const payload = await response.json();
    expect(payload).toMatchObject({ processed: 2, sent: 1, skippedAlreadySent: 1, failed: 0 });
  });
});
