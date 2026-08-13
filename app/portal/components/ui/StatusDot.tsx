import { STATUS_COLORS, DEFAULT_STATUS_COLOR } from "./statusColors";

export function StatusDot({ status, className }: { status: string; className?: string }) {
  const bar = STATUS_COLORS[status]?.bar ?? DEFAULT_STATUS_COLOR.bar;
  return <span className={`h-2 w-2 rounded-full ${bar} ${className ?? ""}`} />;
}
