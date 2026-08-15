import { ChartSpark } from "@/app/portal/components/ui/ChartSpark";
import { Card } from "@/app/portal/components/ui/Card";

type RevenueTrendChartProps = {
  series: number[];
  labels: string[];
  title: string;
  subtitle: string;
  totalLabel: string;
  deltaLabel?: string;
};

export function RevenueTrendChart({ series, labels, title, subtitle, totalLabel, deltaLabel }: RevenueTrendChartProps) {
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{subtitle}</h2>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-slate-900 dark:text-white">{totalLabel}</p>
          {deltaLabel ? <p className="text-xs text-emerald-600 dark:text-emerald-400">{deltaLabel}</p> : null}
        </div>
      </div>
      <ChartSpark series={series} labels={labels} ariaLabel={subtitle} />
    </Card>
  );
}
