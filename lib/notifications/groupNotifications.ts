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

  return date.toLocaleDateString("es-CO", { weekday: "short", day: "2-digit", month: "short" });
}

export function groupNotificationsByDate<T extends NotificationGroupItem>(items: T[]) {
  return items.reduce((acc, item) => {
    const key = labelForDate(item.createdAt);
    acc[key] = acc[key] ?? [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}
