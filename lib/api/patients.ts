import { apiClient } from "./client";
import type { PatientSummary } from "./types";

export async function listPatients() {
  const response = await apiClient.get("patients");
  return response.data;
}

export const patientsKeys = {
  all: ["patients"] as const,
};
