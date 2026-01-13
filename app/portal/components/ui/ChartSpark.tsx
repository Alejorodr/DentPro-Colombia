interface ChartSparkProps {
  className?: string;
  series: number[];
  labels: string[];
  ariaLabel: string;
}

function buildPath(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");
}

export function ChartSpark({ className, series, labels, ariaLabel }: ChartSparkProps) {
  const width = 360;
  const height = 160;
  const paddingX = 20;
  const paddingY = 24;
  const max = Math.max(...series, 1);
  const min = Math.min(...series, 0);
  const range = Math.max(max - min, 1);
  const step = series.length > 1 ? (width - paddingX * 2) / (series.length - 1) : 0;
  const points = series.map((value, index) => ({
    x: paddingX + index * step,
    y: paddingY + (height - paddingY * 2) * (1 - (value - min) / range),
  }));
  const linePath = buildPath(points);
  const areaPath = `${linePath} L ${width - paddingX} ${height - paddingY} L ${paddingX} ${
    height - paddingY
  } Z`;
  const showDots = points.length >= 2 ? [points.at(-1), points.at(-2)].filter(Boolean) : points;

  return (
    <div className={className}>
      <svg viewBox="0 0 360 160" className="h-40 w-full" role="img" aria-label={ariaLabel}>
        <defs>
          <linearGradient id="spark-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1f6cd3" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#1f6cd3" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="360" height="160" rx="18" className="fill-slate-50/60 dark:fill-surface-base/40" />
        {series.length === 0 ? (
          <text
            x="180"
            y="84"
            textAnchor="middle"
            className="fill-slate-400 text-xs font-medium dark:fill-slate-500"
          >
            Sin datos
          </text>
        ) : (
          <>
            <path d={linePath} className="fill-none stroke-brand-teal stroke-[3] dark:stroke-accent-cyan" />
            <path d={areaPath} fill="url(#spark-gradient)" />
            {showDots.map((point) =>
              point ? (
                <circle
                  key={`${point.x}-${point.y}`}
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  className="fill-brand-teal dark:fill-accent-cyan"
                />
              ) : null,
            )}
          </>
        )}
      </svg>
      {labels.length > 0 ? (
        <div className="mt-2 flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
          <span>{labels[0]}</span>
          <span>{labels.at(-1)}</span>
        </div>
      ) : null}
    </div>
  );
}
