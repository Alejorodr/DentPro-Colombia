import { STATUS_COLORS, DEFAULT_STATUS_COLOR } from "./statusColors";

export type BadgeVariant = keyof typeof STATUS_COLORS;

export function StatusBadge({ status }: { status: string }) {
  const entry = STATUS_COLORS[status] ?? { ...DEFAULT_STATUS_COLOR, label: status };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${entry.badge}`}>
      {entry.label}
    </span>
  );
}
