import type { Course, Role, StudyForm, TurnstileMode } from '@/types';

/** 1250 -> "1 250" */
export function formatNumber(n: number): string {
  const s = String(Math.round(Math.abs(n)));
  const out = s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return n < 0 ? `-${out}` : out;
}
export function formatPercent(n: number): string {
  return `${Math.round(n)}%`;
}
/** 8.5 -> "8,5" */
export function formatDecimal(n: number, digits = 1): string {
  return n.toFixed(digits).replace('.', ',').replace(/,0$/, '');
}

export function fullName(p: { lastName: string; firstName: string; middleName: string }): string {
  return `${p.lastName} ${p.firstName} ${p.middleName}`.trim();
}
export function shortName(p: { lastName: string; firstName: string }): string {
  return `${p.lastName} ${p.firstName}`;
}
export function initials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: 'Superadmin',
  direktor: 'Direktor',
  kadrlar: "Kadrlar bo'limi",
};
export const COURSE_LABELS: Record<Course, string> = {
  1: '1-kurs',
  2: '2-kurs',
  3: '3-kurs',
  4: '4-kurs',
  5: 'Magistratura 1-kurs',
  6: 'Magistratura 2-kurs',
};
export const COURSE_OPTIONS = ([1, 2, 3, 4, 5, 6] as const).map((c) => ({ value: String(c), label: COURSE_LABELS[c] }));
export const STUDY_FORM_LABELS: Record<StudyForm, string> = {
  kunduzgi: 'Kunduzgi',
  sirtqi: 'Sirtqi',
  kechki: 'Kechki',
};
export const TURNSTILE_MODE_LABELS: Record<TurnstileMode, string> = {
  in: 'Kirish',
  out: 'Chiqish',
  both: 'Kirish va chiqish',
};

export const POSITIONS = [
  'Kafedra mudiri',
  'Professor',
  'Dotsent',
  "Katta o'qituvchi",
  "O'qituvchi",
  'Assistent',
  "Stajyor-o'qituvchi",
];
export const DEGREES = ["Yo'q", 'PhD', 'DSc', 'Fan nomzodi', 'Fan doktori'];
export const RATES = ['0,25', '0,5', '0,75', '1,0', '1,25', '1,5'];
export const REGIONS = [
  "Qoraqalpog'iston Respublikasi",
  'Andijon viloyati',
  'Buxoro viloyati',
  'Jizzax viloyati',
  'Qashqadaryo viloyati',
  'Navoiy viloyati',
  'Namangan viloyati',
  'Samarqand viloyati',
  'Surxondaryo viloyati',
  'Sirdaryo viloyati',
  'Toshkent viloyati',
  "Farg'ona viloyati",
  'Xorazm viloyati',
  'Toshkent shahri',
];

/** Raqamlardan "+998 (90) 123-45-67" maskasi */
export function formatPhone(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('998')) d = d.slice(3);
  d = d.slice(0, 9);
  if (!d) return '';
  let out = '+998 (' + d.slice(0, 2);
  if (d.length >= 2) out += ')';
  if (d.length > 2) out += ' ' + d.slice(2, 5);
  if (d.length > 5) out += '-' + d.slice(5, 7);
  if (d.length > 7) out += '-' + d.slice(7, 9);
  return out;
}
export function isValidPhone(v: string): boolean {
  return /^\+998 \(\d{2}\) \d{3}-\d{2}-\d{2}$/.test(v);
}
export function formatPassport(raw: string): string {
  const up = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const letters = up.slice(0, 2).replace(/[^A-Z]/g, '');
  const digits = up.slice(letters.length).replace(/\D/g, '').slice(0, 7);
  return letters + (letters.length === 2 ? digits : '');
}
export function isValidPassport(v: string): boolean {
  return /^[A-Z]{2}\d{7}$/.test(v);
}
export function maskPassport(v: string): string {
  if (!v) return '—';
  return v.slice(0, 2) + '*****' + v.slice(-2);
}
export function maskJshshir(v: string): string {
  if (!v) return '—';
  return v.slice(0, 2) + '**********' + v.slice(-2);
}
