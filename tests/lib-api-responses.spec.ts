import { describe, expect, it } from "vitest";

import {
  getCollectionItems,
  getCollectionResult,
  toLegacyAppointmentSummary,
  toLegacyPatientSummary,
} from "@/lib/api/responses";

describe("getCollectionItems", () => {
  it("keeps legacy array responses compatible", () => {
    const items = [{ id: "one" }, { id: "two" }];

    expect(getCollectionItems(items)).toEqual(items);
  });

  it("unwraps paginated API responses", () => {
    const items = [{ id: "one" }];

    expect(
      getCollectionItems({
        items,
        data: [],
        page: 1,
        pageSize: 25,
        total: 1,
        totalPages: 1,
      }),
    ).toEqual(items);
  });

  it("falls back to data for older paginated consumers", () => {
    const data = [{ id: "fallback" }];

    expect(getCollectionItems({ data })).toEqual(data);
  });

  it("preserves pagination metadata", () => {
    const result = getCollectionResult({
      items: [{ id: "one" }],
      page: 1,
      pageSize: 50,
      total: 75,
      totalPages: 2,
    });

    expect(result).toMatchObject({
      items: [{ id: "one" }],
      page: 1,
      pageSize: 50,
      total: 75,
      totalPages: 2,
    });
  });

  it("maps appointment API records to the legacy dashboard table contract", () => {
    expect(
      toLegacyAppointmentSummary({
        id: "appt-1",
        patientId: "patient-1",
        professionalId: "pro-1",
        timeSlotId: "slot-1",
        status: "SCHEDULED",
        service: { name: "Ortodoncia" },
        timeSlot: { startAt: "2026-08-26T14:00:00.000Z" },
        patient: { user: { name: "Ana", lastName: "Perez" } },
        professional: { user: { name: "Dr.", lastName: "Lopez" } },
      }),
    ).toEqual({
      id: "appt-1",
      patientId: "patient-1",
      patientName: "Ana Perez",
      specialistId: "pro-1",
      specialistName: "Dr. Lopez",
      scheduleId: "slot-1",
      preferredDate: undefined,
      service: "Ortodoncia",
      scheduledAt: "2026-08-26T14:00:00.000Z",
      status: "pending",
    });
  });

  it("maps patient API records to the legacy dashboard table contract", () => {
    expect(
      toLegacyPatientSummary({
        id: "profile-1",
        phone: "+57 300 000 0000",
        user: {
          name: "Ana",
          lastName: "Perez",
          email: "ana@example.com",
        },
      }),
    ).toEqual({
      id: "profile-1",
      name: "Ana Perez",
      email: "ana@example.com",
      phone: "+57 300 000 0000",
    });
  });
});
