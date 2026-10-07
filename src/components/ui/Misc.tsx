import { useCallback, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertOctagon, ChevronLeft, ChevronRight, RefreshCw, SearchX } from 'lucide-react';
import { Button } from './Button';
import { formatNumber } from '@/utils/format';

export function Card({ children, className = '', ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

export function TableSkeleton({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3 p-4" aria-busy="true" aria-label="Yuklanmoqda">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 !rounded-full" />
          {Array.from({ length: cols - 1 }).map((__, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ text, action, icon }: { text: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="relative mb-4">
        <svg width="120" height="88" viewBox="0 0 120 88" fill="none" aria-hidden="true">
          <rect x="14" y="14" width="92" height="64" rx="12" fill="var(--surface-2)" stroke="var(--border)" />
          <rect x="26" y="28" width="40" height="6" rx="3" fill="var(--border)" />
          <rect x="26" y="42" width="68" height="6" rx="3" fill="var(--border)" />
          <rect x="26" y="56" width="52" height="6" rx="3" fill="var(--border)" />
        </svg>
        <span className="absolute -bottom-1 -right-1 grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary-ink">{icon ?? <SearchX size={20} />}</span>
      </div>
      <p className="max-w-sm text-sm font-medium text-muted">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-danger-soft text-danger-ink">
        <AlertOctagon size={26} />
      </span>
      <p className="text-sm font-medium text-text">Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.</p>
      <Button variant="outline" className="mt-4" icon={<RefreshCw size={16} />} onClick={onRetry}>
        Qayta yuklash
      </Button>
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, items, size = 'md', className = '' }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode }[]; size?: 'sm' | 'md'; className?: string }) {
  return (
    <div role="tablist" className={`inline-flex max-w-full gap-1 overflow-x-auto rounded-ctl bg-surface-2 p-1 ${className}`}>
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(it.value)}
            className={`focus-ring whitespace-nowrap rounded-[9px] font-semibold transition-colors ${size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'} ${
              active ? 'bg-surface text-primary-ink shadow-card' : 'text-muted hover:text-text'
            }`}
            style={active ? { border: '1px solid var(--card-border)' } : undefined}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

/** Sahifa yorliqlari (chiziqli uslub) */
export function UnderlineTabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode; icon?: ReactNode }[] }) {
  return (
    <div role="tablist" className="no-print flex gap-1 overflow-x-auto border-b border-border">
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(it.value)}
            className={`focus-ring -mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${active ? 'border-primary text-primary-ink' : 'border-transparent text-muted hover:text-text'}`}
          >
            {it.icon}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

export function Pagination({ page, pageSize, total, onPage, onPageSize }: { page: number; pageSize: number; total: number; onPage: (p: number) => void; onPageSize: (n: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const a = total ? (page - 1) * pageSize + 1 : 0;
  const b = Math.min(total, page * pageSize);
  return (
    <div className="no-print flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted">
      <label className="flex items-center gap-2">
        Sahifada:
        <select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} className="focus-ring h-8 rounded-lg border border-border bg-surface-2 px-2 text-sm text-text">
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <span className="tabular">
        {formatNumber(a)}–{formatNumber(b)} / {formatNumber(total)} ta
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} icon={<ChevronLeft size={14} />}>
          Oldingi
        </Button>
        <span className="tabular text-text">
          {page} / {pages}
        </span>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Keyingi
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-text">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-muted">{subtitle}</div>}
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
}
/** Uch nuqta menyusi — portal orqali chiqadi, jadval overflow'i kesmaydi */
export function DropdownMenu({ trigger, items, label }: { trigger: ReactNode; items: MenuItem[]; label: string }) {
  const [pos, setPos] = useState<{ x: number; y: number; up: boolean } | null>(null);
  const close = useCallback(() => setPos(null), []);
  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={!!pos}
        onClick={(e) => {
          e.stopPropagation();
          const r = e.currentTarget.getBoundingClientRect();
          const up = r.bottom + items.length * 40 + 20 > window.innerHeight;
          setPos(pos ? null : { x: r.right, y: up ? r.top : r.bottom, up });
        }}
        className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
      >
        {trigger}
      </button>
      {pos &&
        createPortal(
          <div className="fixed inset-0 z-[80]" onClick={close} onKeyDown={(e) => e.key === 'Escape' && close()}>
            <div
              role="menu"
              className="anim-pop fixed min-w-[200px] rounded-ctl border border-border bg-surface p-1 shadow-pop"
              style={{ left: pos.x, top: pos.y, transform: `translate(-100%, ${pos.up ? 'calc(-100% - 6px)' : '6px'})` }}
              onClick={(e) => e.stopPropagation()}
            >
              {items.map((it, i) => (
                <button
                  key={i}
                  role="menuitem"
                  type="button"
                  autoFocus={i === 0}
                  onClick={() => {
                    close();
                    it.onClick();
                  }}
                  className={`focus-ring flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${it.danger ? 'text-danger-ink hover:bg-danger-soft' : 'text-text hover:bg-surface-2'}`}
                >
                  <span className={it.danger ? '' : 'text-muted'}>{it.icon}</span>
                  {it.label}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export function SectionTitle({ icon, title, tag, right }: { icon?: ReactNode; title: string; tag?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        {icon && <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary-ink">{icon}</span>}
        <h2 className="text-base font-semibold text-text">{title}</h2>
        {tag}
      </div>
      {right}
    </div>
  );
}

export function InfoBanner({ tone = 'warning', icon, children }: { tone?: 'warning' | 'info' | 'danger'; icon: ReactNode; children: ReactNode }) {
  const cls = tone === 'warning' ? 'bg-warning-soft text-warning-ink' : tone === 'danger' ? 'bg-danger-soft text-danger-ink' : 'bg-info-soft text-info-ink';
  return (
    <div className={`flex items-start gap-3 rounded-ctl px-4 py-3 text-sm font-medium ${cls}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>{children}</div>
    </div>
  );
}
