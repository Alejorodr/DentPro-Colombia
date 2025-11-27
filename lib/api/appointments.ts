import { apiFetch } from "./client";
import type { AppointmentRequestPayload, AppointmentSummary } from "./types";

export async function listAppointments() {
  return apiFetch<AppointmentSummary[]>("appointments");
}

export async function createAppointmentRequest(payload: AppointmentRequestPayload) {
  return apiFetch<AppointmentSummary>("appointments", {
    method: "POST",
    body: JSON.stringify(payload),
    skipAuth: true,
  });
}

export const appointmentsKeys = {
  all: ["appointments"] as const,
};

