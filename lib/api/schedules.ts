import { apiClient } from "./client";
import type { ScheduleSlot } from "./types";

export async function listSchedules() {
  const response = await apiClient.get("schedules");
  return response.data;
}

export const schedulesKeys = {
  all: ["schedules"] as const,
};

