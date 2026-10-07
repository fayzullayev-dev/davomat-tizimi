import { useEffect, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, FilterX, Printer, FileSpreadsheet } from 'lucide-react';
import type { AttendanceSummary, StatusFilter } from '@/types';
import { formatNumber } from '@/utils/format';
import { Button } from '@/components/ui/Button';

export function SummaryChips({ summary, active, onPick }: { summary: AttendanceSummary | null; active: StatusFilter; onPick: (s: StatusFilter) => void }) {
  const items: { key: StatusFilter; label: string; value: number; cls: string; dot: string }[] = [
    { key: '', label: 'Jami', value: summary ? summary.total - summary.dam : 0, cls: 'bg-surface text-text border-border', dot: 'bg-neutral' },
    { key: 'keldi', label: 'Keldi', value: summary?.keldi ?? 0, cls: 'bg-success-soft text-success-ink border-transparent', dot: 'bg-success' },
    { key: 'kechikdi', label: 'Kechikdi', value: summary?.kechikdi ?? 0, cls: 'bg-warning-soft text-warning-ink border-transparent', dot: 'bg-warning' },
    { key: 'kelmadi', label: 'Kelmadi', value: summary?.kelmadi ?? 0, cls: 'bg-danger-soft text-danger-ink border-transparent', dot: 'bg-danger' },
    { key: 'binoda', label: 'Binoda', value: summary?.binoda ?? 0, cls: 'bg-info-soft text-info-ink border-transparent', dot: 'bg-info' },
  ];
  return (
    <div className="no-print mb-4 flex flex-wrap gap-2">
      {items.map((it) => {
        const on = active === it.key;
        return (
          <button
            key={it.label}
            type="button"
            onClick={() => onPick(on && it.key ? '' : it.key)}
            aria-pressed={on}
            className={`focus-ring inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-all hover:brightness-95 ${it.cls} ${on ? 'ring-2 ring-primary ring-offset-2' : ''}`}
            style={{ ['--tw-ring-offset-color' as string]: 'var(--bg)' }}
          >
            <span className={`h-2 w-2 rounded-full ${it.dot}`} />
            {it.label}: <span className="tabular">{summary ? formatNumber(it.value) : '…'}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SortTh<K extends string>({ k, sort, onSort, children, className = '' }: { k: K; sort: { key: K; dir: 'asc' | 'desc' }; onSort: (k: K) => void; children: ReactNode; className?: string }) {
  const on = sort.key === k;
  const Icon = !on ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className={`th ${className}`} aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(k)} className="focus-ring inline-flex items-center gap-1 rounded uppercase hover:text-text">
        {children}
        <Icon size={12} className={on ? 'text-primary-ink' : 'opacity-50'} />
      </button>
    </th>
  );
}

export function ExportPrintButtons({ onExport, onPrint }: { onExport: () => void; onPrint: () => void }) {
  return (
    <>
      <Button variant="outline" icon={<FileSpreadsheet size={16} />} onClick={onExport}>
        Excelga yuklab olish
      </Button>
      <Button variant="outline" icon={<Printer size={16} />} onClick={onPrint}>
        Chop etish
      </Button>
    </>
  );
}

export function ClearFiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" icon={<FilterX size={16} />} onClick={onClick} className="!text-danger-ink hover:!bg-danger-soft">
      Filtrlarni tozalash
    </Button>
  );
}

/** Chop etishdan oldin barcha qatorlarni ko'rsatish uchun */
export function usePrint() {
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    if (!printing) return;
    const t = setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 120);
    return () => clearTimeout(t);
  }, [printing]);
  return [printing, () => setPrinting(true)] as const;
}

export function compare(a: string | number | null | undefined, b: string | number | null | undefined) {
  if (a === b) return 0;
  if (a === null || a === undefined || a === '') return 1;
  if (b === null || b === undefined || b === '') return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'uz');
}

export const STATUS_ORDER: Record<string, number> = { keldi: 0, kechikdi: 1, kelmadi: 2, dam: 3, kelajak: 4 };

export function PrintTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="print-only mb-4">
      <h1 className="text-xl font-bold">{title}</h1>
      {sub && <p className="text-sm">{sub}</p>}
    </div>
  );
}
