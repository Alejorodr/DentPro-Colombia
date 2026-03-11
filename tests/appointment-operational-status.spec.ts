import { describe, expect, it } from "vitest";
import { AppointmentStatus } from "@prisma/client";

import { toOperationalStatus } from "@/lib/appointments/status";

describe("appointment operational status", () => {
  it("maps CHECKED_IN status as CHECKED_IN", () => {
    expect(
      toOperationalStatus({
        status: AppointmentStatus.CHECKED_IN,
      }),
    ).toBe("CHECKED_IN");
  });

  it("maps NO_SHOW status as NO_SHOW", () => {
    expect(
      toOperationalStatus({
        status: AppointmentStatus.NO_SHOW,
      }),
    ).toBe("NO_SHOW");
  });
});
