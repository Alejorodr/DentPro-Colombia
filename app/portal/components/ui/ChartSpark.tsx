interface ChartSparkProps {
  className?: string;
}

export function ChartSpark({ className }: ChartSparkProps) {
  return (
    <div className={className}>
      <svg viewBox="0 0 360 160" className="h-40 w-full" role="img" aria-label="Tendencia de ingresos">
        <defs>
          <linearGradient id="spark-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1f6cd3" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#1f6cd3" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="360" height="160" rx="18" className="fill-slate-50/60 dark:fill-surface-base/40" />
        <path
          d="M20 112 L70 92 L120 100 L170 68 L220 78 L270 46 L320 56"
          className="fill-none stroke-brand-teal stroke-[3] dark:stroke-accent-cyan"
        />
        <path
          d="M20 112 L70 92 L120 100 L170 68 L220 78 L270 46 L320 56 L320 140 L20 140 Z"
          fill="url(#spark-gradient)"
        />
        <circle cx="170" cy="68" r="5" className="fill-brand-teal dark:fill-accent-cyan" />
        <circle cx="270" cy="46" r="5" className="fill-brand-teal dark:fill-accent-cyan" />
      </svg>
    </div>
  );
}
