import type { TooltipProps } from 'recharts';

/** Recharts uchun o'zbekcha, mavzuga mos tooltip */
export function ChartTooltip({ active, payload, label, labelFormatter, valueSuffix = '' }: TooltipProps<number, string> & { labelFormatter?: (l: string) => string; valueSuffix?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-ctl border border-border bg-surface px-3 py-2 text-xs shadow-pop">
      {label !== undefined && <div className="mb-1 font-semibold text-text">{labelFormatter ? labelFormatter(String(label)) : label}</div>}
      <ul className="space-y-0.5">
        {payload.map((p) => (
          <li key={String(p.dataKey ?? p.name)} className="flex items-center gap-2 text-muted">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: (p.payload as { fill?: string })?.fill ?? p.color }} />
            <span>{p.name}</span>
            <span className="ml-auto pl-3 font-semibold text-text tabular">
              — {p.value}
              {valueSuffix}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
