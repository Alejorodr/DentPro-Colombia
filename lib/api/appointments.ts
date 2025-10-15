import { apiClient } from "./client";
import type { AppointmentRequestPayload, AppointmentSummary } from "./types";

export async function listAppointments() {
  const response = await apiClient.get("appointments");
  return response.data;
}

export async function createAppointmentRequest(payload: AppointmentRequestPayload) {
  const response = await apiClient.post("appointments", payload);
  return response.data;
}

export const appointmentsKeys = {
  all: ["appointments"] as const,
};
