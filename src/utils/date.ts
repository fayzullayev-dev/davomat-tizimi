// O'zbek tilidagi sana/vaqt formatlash. Brauzer locale'idan foydalanilmaydi.

export const MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr',
];
/** JS getDay() tartibida: 0 = Yakshanba */
export const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
export const WEEKDAYS_SHORT = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];
/** Dushanbadan boshlanadigan tartib (kalendar uchun) */
export const WEEK_MON_FIRST = [1, 2, 3, 4, 5, 6, 0];

const pad = (n: number) => String(n).padStart(2, '0');
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** YYYY-MM-DD (mahalliy vaqt bo'yicha) */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function todayISO(): string {
  return toISODate(new Date());
}
export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  let guard = 0;
  while (cur <= to && guard < 400) {
    out.push(cur);
    cur = addDays(cur, 1);
    guard++;
  }
  return out;
}
export function startOfWeek(iso: string): string {
  const d = parseISODate(iso);
  const dow = (d.getDay() + 6) % 7; // Dushanba = 0
  d.setDate(d.getDate() - dow);
  return toISODate(d);
}
export function startOfMonth(iso: string): string {
  return iso.slice(0, 8) + '01';
}
export function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** "2026-yil 7-oktyabr, Chorshanba" */
export function formatFullDate(input: string | Date): string {
  const d = typeof input === 'string' ? (input.length === 10 ? parseISODate(input) : new Date(input)) : input;
  return `${d.getFullYear()}-yil ${d.getDate()}-${MONTHS[d.getMonth()]}, ${WEEKDAYS[d.getDay()]}`;
}
/** "7-oktyabr" */
export function formatDayMonth(input: string | Date): string {
  const d = typeof input === 'string' ? (input.length === 10 ? parseISODate(input) : new Date(input)) : input;
  return `${d.getDate()}-${MONTHS[d.getMonth()]}`;
}
/** "07.10.2026" */
export function formatShortDate(input: string | Date | null | undefined): string {
  if (!input) return '—';
  const d = typeof input === 'string' ? (input.length === 10 ? parseISODate(input) : new Date(input)) : input;
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}
/** "Oktyabr 2026" */
export function formatMonthYear(year: number, month0: number): string {
  return `${cap(MONTHS[month0])} ${year}`;
}
/** "08:06" */
export function formatTime(input: string | Date | null | undefined): string {
  if (!input) return '—';
  const d = typeof input === 'string' ? new Date(input) : input;
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
/** "16:45:12" */
export function formatClock(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
/** "8 soat 43 daq" */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} daq`;
  if (r === 0) return `${h} soat`;
  return `${h} soat ${r} daq`;
}
/** "07.10.2026 08:06" */
export function formatDateTime(input: string | null): string {
  if (!input) return '—';
  return `${formatShortDate(input)} ${formatTime(input)}`;
}
/** "08:30" -> 510 */
export function hmToMinutes(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
export function minutesToHM(min: number): string {
  const m = Math.max(0, Math.round(min));
  return `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
}
export function minutesOfDay(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}
/** Sana + daqiqadan ISO vaqt yasash */
export function isoAt(date: string, minutes: number, seconds = 0): string {
  const d = parseISODate(date);
  d.setHours(Math.floor(minutes / 60), minutes % 60, seconds, 0);
  return d.toISOString();
}

/** Davr matni: "7-oktyabr — 12-oktyabr 2026" */
export function formatRange(from: string, to: string): string {
  if (from === to) return formatFullDate(from);
  const a = parseISODate(from);
  const b = parseISODate(to);
  if (a.getFullYear() === b.getFullYear()) {
    return `${formatDayMonth(a)} — ${formatDayMonth(b)} ${b.getFullYear()}`;
  }
  return `${formatShortDate(a)} — ${formatShortDate(b)}`;
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 12) return 'Xayrli tong';
  if (h < 18) return 'Xayrli kun';
  return 'Xayrli kech';
}
