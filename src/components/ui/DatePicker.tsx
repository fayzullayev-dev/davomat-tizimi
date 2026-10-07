import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  MONTHS, WEEKDAYS_SHORT, WEEK_MON_FIRST, addDays, cap, daysInMonth, formatMonthYear, formatRange, formatShortDate,
  parseISODate, startOfMonth, startOfWeek, toISODate, todayISO,
} from '@/utils/date';

export function useClickOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, close]);
  return ref;
}

interface CalendarProps {
  year: number;
  month0: number;
  onNav: (year: number, month0: number) => void;
  isSelected: (d: string) => boolean;
  isInRange?: (d: string) => boolean;
  onPick: (d: string) => void;
  max?: string;
  min?: string;
  yearSelect?: boolean;
  onHoverDay?: (d: string | null) => void;
}
export function Calendar({ year, month0, onNav, isSelected, isInRange, onPick, max, min, yearSelect, onHoverDay }: CalendarProps) {
  const first = new Date(year, month0, 1);
  const offset = (first.getDay() + 6) % 7;
  const n = daysInMonth(year, month0);
  const cells: (string | null)[] = [...Array(offset).fill(null), ...Array.from({ length: n }, (_, i) => toISODate(new Date(year, month0, i + 1)))];
  while (cells.length % 7) cells.push(null);
  const today = todayISO();
  const prev = () => (month0 === 0 ? onNav(year - 1, 11) : onNav(year, month0 - 1));
  const next = () => (month0 === 11 ? onNav(year + 1, 0) : onNav(year, month0 + 1));
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 90 }, (_, i) => thisYear + 10 - i);

  return (
    <div className="w-[280px] select-none">
      <div className="mb-2 flex items-center gap-1">
        <button type="button" onClick={prev} aria-label="Oldingi oy" title="Oldingi oy" className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text">
          <ChevronLeft size={16} />
        </button>
        {yearSelect ? (
          <div className="flex flex-1 justify-center gap-1">
            <select aria-label="Oy" value={month0} onChange={(e) => onNav(year, Number(e.target.value))} className="focus-ring rounded-md bg-surface-2 px-1.5 py-1 text-sm font-semibold text-text">
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>
                  {cap(m)}
                </option>
              ))}
            </select>
            <select aria-label="Yil" value={year} onChange={(e) => onNav(Number(e.target.value), month0)} className="focus-ring rounded-md bg-surface-2 px-1.5 py-1 text-sm font-semibold text-text tabular">
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex-1 text-center text-sm font-semibold text-text">{formatMonthYear(year, month0)}</div>
        )}
        <button type="button" onClick={next} aria-label="Keyingi oy" title="Keyingi oy" className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEK_MON_FIRST.map((d) => (
          <div key={d} className={`py-1 text-[11px] font-semibold uppercase ${d === 0 || d === 6 ? 'text-danger-ink' : 'text-muted'}`}>
            {WEEKDAYS_SHORT[d]}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const sel = isSelected(d);
          const inR = isInRange?.(d);
          const disabled = (max && d > max) || (min && d < min);
          return (
            <button
              key={d}
              type="button"
              disabled={!!disabled}
              onClick={() => onPick(d)}
              onMouseEnter={() => onHoverDay?.(d)}
              className={`focus-ring h-9 rounded-lg text-sm tabular transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                sel ? 'bg-primary font-semibold text-primary-fg' : inR ? 'bg-primary-soft text-primary-ink' : 'text-text hover:bg-surface-2'
              } ${d === today && !sel ? 'font-bold text-primary-ink ring-1 ring-inset ring-primary' : ''}`}
            >
              {parseISODate(d).getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Popover({ open, children, align = 'left' }: { open: boolean; children: ReactNode; align?: 'left' | 'right' }) {
  if (!open) return null;
  return <div className={`anim-pop absolute top-full z-50 mt-2 rounded-card border border-border bg-surface p-3 shadow-pop ${align === 'right' ? 'right-0' : 'left-0'}`}>{children}</div>;
}

interface DatePickerProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
  id?: string;
  max?: string;
  min?: string;
  yearSelect?: boolean;
  clearable?: boolean;
}
export function DatePicker({ value, onChange, placeholder = 'Sanani tanlang', invalid, id, max, min, yearSelect = true, clearable }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const base = value ? parseISODate(value) : max ? parseISODate(max) : new Date();
  const [view, setView] = useState({ y: base.getFullYear(), m: base.getMonth() });
  const ref = useClickOutside(open, () => setOpen(false));
  useEffect(() => {
    if (open) setView({ y: base.getFullYear(), m: base.getMonth() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        id={id}
        type="button"
        aria-invalid={invalid || undefined}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className={`input flex items-center gap-2 text-left ${value ? 'text-text' : 'text-muted'}`}
      >
        <CalendarDays size={16} className="shrink-0 text-muted" />
        <span className="flex-1 truncate tabular">{value ? formatShortDate(value) : placeholder}</span>
        {clearable && value && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Tozalash"
            title="Tozalash"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="rounded p-0.5 text-muted hover:text-text"
          >
            <X size={14} />
          </span>
        )}
      </button>
      <Popover open={open}>
        <Calendar
          year={view.y}
          month0={view.m}
          onNav={(y, m) => setView({ y, m })}
          isSelected={(d) => d === value}
          onPick={(d) => {
            onChange(d);
            setOpen(false);
          }}
          max={max}
          min={min}
          yearSelect={yearSelect}
        />
      </Popover>
    </div>
  );
}

interface RangeProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  maxToday?: boolean;
}
export function DateRangePicker({ from, to, onChange, maxToday = true }: RangeProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const b = parseISODate(to);
  const [view, setView] = useState({ y: b.getFullYear(), m: b.getMonth() });
  const ref = useClickOutside(open, () => {
    setOpen(false);
    setDraft(null);
  });
  const today = todayISO();
  const quick: [string, string, string][] = [
    ['Bugun', today, today],
    ['Kecha', addDays(today, -1), addDays(today, -1)],
    ['Shu hafta', startOfWeek(today), today],
    ['Shu oy', startOfMonth(today), today],
  ];
  const apply = (a: string, z: string) => {
    onChange(a, z);
    setOpen(false);
    setDraft(null);
  };
  const lo = draft ? (hover && hover < draft ? hover : draft) : from;
  const hi = draft ? (hover && hover > draft ? hover : draft) : to;

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="dialog" onClick={() => setOpen((o) => !o)} className="input flex items-center gap-2 text-left text-text">
        <CalendarDays size={16} className="shrink-0 text-muted" />
        <span className="flex-1 truncate tabular">{from === to ? formatShortDate(from) : `${formatShortDate(from)} — ${formatShortDate(to)}`}</span>
      </button>
      <Popover open={open}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex flex-row flex-wrap gap-1 sm:w-28 sm:flex-col">
            {quick.map(([label, a, z]) => (
              <button
                key={label}
                type="button"
                onClick={() => apply(a, z)}
                className={`focus-ring rounded-lg px-3 py-1.5 text-left text-sm font-medium transition-colors ${from === a && to === z ? 'bg-primary-soft text-primary-ink' : 'text-text hover:bg-surface-2'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div>
            <Calendar
              year={view.y}
              month0={view.m}
              onNav={(y, m) => setView({ y, m })}
              isSelected={(d) => d === lo || d === hi}
              isInRange={(d) => d > lo && d < hi}
              onPick={(d) => {
                if (!draft) setDraft(d);
                else apply(d < draft ? d : draft, d < draft ? draft : d);
              }}
              max={maxToday ? today : undefined}
              onHoverDay={setHover}
            />
            <p className="mt-2 text-center text-xs text-muted">
              {draft ? 'Davr oxirini tanlang' : formatRange(from, to)}
            </p>
          </div>
        </div>
      </Popover>
    </div>
  );
}

export function MonthPicker({ year, month0, onChange, maxCurrent = true }: { year: number; month0: number; onChange: (y: number, m: number) => void; maxCurrent?: boolean }) {
  const now = new Date();
  const atMax = maxCurrent && year === now.getFullYear() && month0 === now.getMonth();
  return (
    <div className="inline-flex h-10 items-center rounded-ctl border border-border bg-surface-2">
      <button type="button" aria-label="Oldingi oy" title="Oldingi oy" onClick={() => (month0 === 0 ? onChange(year - 1, 11) : onChange(year, month0 - 1))} className="focus-ring grid h-full w-9 place-items-center rounded-l-ctl text-muted hover:bg-surface-3 hover:text-text">
        <ChevronLeft size={16} />
      </button>
      <span className="min-w-[128px] px-2 text-center text-sm font-semibold text-text tabular">{formatMonthYear(year, month0)}</span>
      <button type="button" disabled={atMax} aria-label="Keyingi oy" title="Keyingi oy" onClick={() => (month0 === 11 ? onChange(year + 1, 0) : onChange(year, month0 + 1))} className="focus-ring grid h-full w-9 place-items-center rounded-r-ctl text-muted hover:bg-surface-3 hover:text-text disabled:opacity-35">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
