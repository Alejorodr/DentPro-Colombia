import { CLINIC_TIME_ZONE } from "@/lib/dates/tz";
export type NotificationGroupItem = {
  id: string;
  createdAt: string;
};

function labelForDate(dateIso: string) {
  const now = new Date();
  const date = new Date(dateIso);
  if (now.toDateString() === date.toDateString()) return "Hoy";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (yesterday.toDateString() === date.toDateString()) return "Ayer";

  return date.toLocaleDateString("es-CO", { timeZone: CLINIC_TIME_ZONE, weekday: "short", day: "2-digit", month: "short" });
}

export function groupNotificationsByDate<T extends NotificationGroupItem>(items: T[]) {
  // Object.groupBy conserva el orden de inserción, igual que el reduce anterior.
  return Object.groupBy(items, (item) => labelForDate(item.createdAt)) as Record<string, T[]>;
}
