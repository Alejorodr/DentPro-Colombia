import { apiFetch } from "./client";
import type { PatientSummary } from "./types";

export async function listPatients() {
  return apiFetch<PatientSummary[]>("patients");
}
