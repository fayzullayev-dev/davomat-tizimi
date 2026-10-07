// Mock backend mantig'i: xom turniket o'tishlaridan davomatni hisoblaydi.
// Haqiqiy backend ulanganda bu hisob-kitoblar serverda bajariladi.
import type {
  AttendanceFilters, AttendanceRow, AttendanceStatus, AttendanceSummary, PassEvent, PersonType, Student, Teacher,
} from '@/types';
import { addDays, daysBetween, hmToMinutes, minutesOfDay, parseISODate, todayISO } from '@/utils/date';
import { fullName } from '@/utils/format';
import * as db from './seed';

export function isDayOff(date: string): boolean {
  const dow = parseISODate(date).getDay();
  if (db.settings.weekendDays.includes(dow)) return true;
  return db.settings.holidays.some((h) => (h.recurring ? h.date.slice(5) === date.slice(5) : h.date === date));
}
export function holidayName(date: string): string | null {
  const h = db.settings.holidays.find((x) => (x.recurring ? x.date.slice(5) === date.slice(5) : x.date === date));
  return h?.name ?? null;
}

export function eventsFor(type: PersonType, id: string, date: string): PassEvent[] {
  return (db.events.get(db.evKey(type, id, date)) ?? []).slice().sort((a, b) => a.time.localeCompare(b.time));
}

export function computeRow(type: PersonType, id: string, date: string): AttendanceRow {
  const key = db.evKey(type, id, date);
  const evs = eventsFor(type, id, date);
  const today = todayISO();
  const base: AttendanceRow = {
    key, personType: type, personId: id, date, arrival: null, departure: null, inside: false, openSince: null,
    status: 'kelmadi', lateMinutes: 0, workedMinutes: 0, reason: db.reasons.get(key) ?? null,
  };
  const firstIn = evs.find((e) => e.direction === 'in');
  if (!firstIn) {
    if (date > today) base.status = 'kelajak';
    else if (isDayOff(date)) base.status = 'dam';
    return base;
  }
  base.arrival = firstIn.time;
  // Ishlagan vaqt: kirish->chiqish juftliklari
  let open: string | null = null;
  let worked = 0;
  for (const e of evs) {
    if (e.direction === 'in') {
      if (!open) open = e.time;
    } else if (open) {
      worked += (new Date(e.time).getTime() - new Date(open).getTime()) / 60000;
      open = null;
      base.departure = e.time;
    }
  }
  base.workedMinutes = Math.round(worked);
  if (open) {
    if (date === today) {
      base.inside = true;
      base.openSince = open;
      base.departure = null;
    }
  }
  const start = hmToMinutes(type === 'teacher' ? db.settings.teacherStart : db.settings.studentStart);
  const thr = type === 'teacher' ? db.settings.teacherThreshold : db.settings.studentThreshold;
  const arr = minutesOfDay(firstIn.time);
  base.lateMinutes = Math.max(0, arr - start);
  base.status = isDayOff(date) ? 'keldi' : arr > start + thr ? 'kechikdi' : 'keldi';
  if (base.status === 'keldi') base.lateMinutes = 0;
  return base;
}

export function summarize(rows: AttendanceRow[]): AttendanceSummary {
  const s: AttendanceSummary = { total: 0, keldi: 0, kechikdi: 0, kelmadi: 0, binoda: 0, dam: 0 };
  for (const r of rows) {
    if (r.status === 'kelajak') continue;
    s.total++;
    if (r.status === 'keldi') s.keldi++;
    else if (r.status === 'kechikdi') s.kechikdi++;
    else if (r.status === 'kelmadi') s.kelmadi++;
    else if (r.status === 'dam') s.dam++;
    if (r.inside) s.binoda++;
  }
  return s;
}

export function matchStatus(r: AttendanceRow, f?: string) {
  if (!f) return true;
  if (f === 'binoda') return r.inside;
  return r.status === f;
}

const norm = (s: string) => s.toLowerCase().replace(/[ʻʼ`'‘’]/g, "'");

export function teacherRows(f: AttendanceFilters) {
  const days = daysBetween(f.from, f.to);
  const q = norm(f.search ?? '');
  const people = db.teachers.filter(
    (t) => t.active && (!f.departmentId || t.departmentId === f.departmentId) && (!f.position || t.position === f.position) &&
      (!q || norm(fullName(t)).includes(q) || t.turnstileId.includes(q)),
  );
  const all: (AttendanceRow & { person: Teacher })[] = [];
  for (const d of days) for (const p of people) all.push({ ...computeRow('teacher', p.id, d), person: p });
  const scoped = all.filter((r) => r.status !== 'kelajak');
  return { rows: scoped.filter((r) => matchStatus(r, f.status)), summary: summarize(scoped) };
}

export function studentRows(f: AttendanceFilters) {
  const days = daysBetween(f.from, f.to);
  const q = norm(f.search ?? '');
  const people = db.students.filter(
    (s) => s.active && (!f.facultyId || s.facultyId === f.facultyId) && (!f.departmentId || s.departmentId === f.departmentId) &&
      (!f.directionId || s.directionId === f.directionId) && (!f.course || String(s.course) === f.course) &&
      (!f.groupId || s.groupId === f.groupId) &&
      (!q || norm(fullName(s)).includes(q) || s.turnstileId.includes(q) || s.studentId.includes(q)),
  );
  const all: (AttendanceRow & { person: Student })[] = [];
  for (const d of days) for (const p of people) all.push({ ...computeRow('student', p.id, d), person: p });
  const scoped = all.filter((r) => r.status !== 'kelajak');
  return { rows: scoped.filter((r) => matchStatus(r, f.status)), summary: summarize(scoped) };
}

export function daySummary(type: PersonType, date: string) {
  const list = type === 'teacher' ? db.teachers.filter((t) => t.active) : db.students.filter((s) => s.active);
  return summarize(list.map((p) => computeRow(type, p.id, date)));
}

/** Oxirgi n ta ish kuni (bugun ham kiradi) */
export function lastWorkdays(n: number, until = todayISO()): string[] {
  const out: string[] = [];
  let d = until;
  let guard = 0;
  while (out.length < n && guard < 60) {
    if (!isDayOff(d)) out.unshift(d);
    d = addDays(d, -1);
    guard++;
  }
  return out;
}

export function personLabel(type: PersonType, id: string) {
  if (type === 'teacher') {
    const t = db.teachers.find((x) => x.id === id);
    return t ? { fullName: fullName(t), photo: t.photo } : null;
  }
  const s = db.students.find((x) => x.id === id);
  return s ? { fullName: fullName(s), photo: s.photo } : null;
}

export function isStatus(s: string): s is AttendanceStatus {
  return ['keldi', 'kechikdi', 'kelmadi', 'dam', 'kelajak'].includes(s);
}
