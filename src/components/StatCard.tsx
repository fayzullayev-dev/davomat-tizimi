import type { ReactNode } from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { formatNumber } from '@/utils/format';
import { Skeleton } from './ui/Misc';

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const w = 72;
  const h = 26;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 2 - ((v - min) / (max - min || 1)) * (h - 4)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="shrink-0">
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={color} opacity="0.12" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface Props {
  label: string;
  value: number;
  icon: ReactNode;
  tone?: 'gradient' | 'success' | 'warning' | 'danger' | 'info';
  sub?: ReactNode;
  trend?: number;
  /** Ko'payish yaxshimi (masalan, "Kelmaganlar" uchun yo'q) */
  goodWhenUp?: boolean;
  spark?: number[];
  sparkColor?: string;
  onClick?: () => void;
  loading?: boolean;
}

const CHIP: Record<string, string> = {
  success: 'bg-success-soft text-success-ink',
  warning: 'bg-warning-soft text-warning-ink',
  danger: 'bg-danger-soft text-danger-ink',
  info: 'bg-info-soft text-info-ink',
};

export function StatCard({ label, value, icon, tone = 'success', sub, trend, goodWhenUp = true, spark, sparkColor, onClick, loading }: Props) {
  if (loading)
    return (
      <div className="card p-5">
        <Skeleton className="h-10 w-10 !rounded-full" />
        <Skeleton className="mt-4 h-7 w-20" />
        <Skeleton className="mt-2 h-4 w-28" />
      </div>
    );
  const gradient = tone === 'gradient';
  const T = trend === undefined ? null : trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const good = trend === undefined || trend === 0 ? null : (trend > 0) === goodWhenUp;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`focus-ring group relative flex h-full w-full flex-col overflow-hidden rounded-card p-5 text-left transition-all hover:-translate-y-0.5 ${
        gradient ? 'text-white shadow-card' : 'card hover:shadow-pop'
      }`}
      style={gradient ? { background: 'linear-gradient(135deg, #00873A 0%, #0FA968 100%)' } : undefined}
    >
      {gradient && <span className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />}
      <div className="flex items-start justify-between gap-2">
        <span className={`grid h-10 w-10 place-items-center rounded-full ${gradient ? 'bg-white/20 text-white' : CHIP[tone]}`}>{icon}</span>
        {spark && !gradient && <Sparkline data={spark} color={sparkColor ?? 'currentColor'} />}
      </div>
      <div className={`mt-4 text-3xl font-bold tracking-tight tabular ${gradient ? 'text-white' : 'text-text'}`}>{formatNumber(value)}</div>
      <div className={`mt-0.5 text-sm font-medium ${gradient ? 'text-white/90' : 'text-muted'}`}>{label}</div>
      {(sub || T) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {sub && <span className={`font-semibold ${gradient ? 'text-white' : 'text-text'}`}>{sub}</span>}
          {T && (
            <span className={`inline-flex items-center gap-1 font-medium ${gradient ? 'text-white/90' : good === null ? 'text-muted' : good ? 'text-success-ink' : 'text-danger-ink'}`}>
              <T size={13} />
              {trend! > 0 ? '+' : ''}
              {trend} kechagiga nisbatan
            </span>
          )}
        </div>
      )}
    </button>
  );
}
