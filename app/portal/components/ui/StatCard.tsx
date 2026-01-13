import type { ComponentType, SVGProps } from "react";

import { Card } from "@/app/portal/components/ui/Card";

type IconProps = SVGProps<SVGSVGElement> & { weight?: "bold" | "duotone" | "fill" | "light" | "regular" | "thin" };

type StatCardProps = {
  label: string;
  value: string;
  change: string;
  icon: ComponentType<IconProps>;
  iconClassName?: string;
};

export function StatCard({ label, value, change, icon: Icon, iconClassName }: StatCardProps) {
  return (
    <Card className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{value}</p>
        <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">{change}</p>
      </div>
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-teal/10 text-brand-teal dark:bg-accent-cyan/10 dark:text-accent-cyan ${
          iconClassName ?? ""
        }`}
      >
        <Icon aria-hidden="true" className="h-6 w-6" weight="bold" />
      </div>
    </Card>
  );
}
