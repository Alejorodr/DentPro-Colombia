import { apiFetch } from "./client";
import type { ScheduleSlot } from "./types";

export async function listSchedules() {
  return apiFetch<ScheduleSlot[]>("schedules");
}

export const schedulesKeys = {
  all: ["schedules"] as const,
};

