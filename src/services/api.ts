/**
 * API xizmati qatlami.
 * Hozircha barcha funksiyalar mock ma'lumot qaytaradi (300–600 ms sun'iy kechikish bilan).
 * Haqiqiy backend ulanganda faqat shu faylni almashtirish kifoya — funksiya imzolari o'zgarmaydi.
 */
import type {
  AbsenceReason, AttendanceFilters, AttendanceRow, Course, Department, Faculty, Group, Holiday, LivePass,
  Notification, PassEvent, PersonType, Role, SearchResult, Settings, Student, StudentAttendanceRow,
  StudyDirection, Teacher, TeacherAttendanceRow, Turnstile, User,
} from '@/types';
import * as db from '@/mock/seed';
import * as eng from '@/mock/engine';
import { addDays, daysBetween, daysInMonth, isoAt, minutesOfDay, toISODate, todayISO } from '@/utils/date';
import { fullName } from '@/utils/format';

// ============ Infratuzilma ============
export class ApiError extends Error {
  field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.field = field;
  }
}

let offline = false;
const netListeners = new Set<(off: boolean) => void>();
export function setOfflineMode(v: boolean) {
  offline = v;
  netListeners.forEach((l) => l(v));
}
export function isOfflineMode() {
  return offline;
}
export function onNetworkChange(cb: (off: boolean) => void) {
  netListeners.add(cb);
  return () => netListeners.delete(cb);
}

const delay = () => new Promise((r) => setTimeout(r, 300 + Math.random() * 300));
async function call<T>(fn: () => T): Promise<T> {
  await delay();
  if (offline) throw new ApiError("Internet aloqasi yo'q");
  return structuredClone(fn());
}
const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const stripPwd = ({ password: _p, ...u }: User & { password: string }): User => u;

// ============ Avtorizatsiya ============
export function login(loginName: string, password: string): Promise<User> {
  return call(() => {
    const u = db.users.find((x) => x.login === loginName.trim());
    if (!u || u.password !== password) throw new ApiError("Login yoki parol noto'g'ri");
    if (!u.active) throw new ApiError('Foydalanuvchi bloklangan. Tizim administratoriga murojaat qiling.');
    u.lastLogin = new Date().toISOString();
    return stripPwd(u);
  });
}
export function changePassword(userId: string, current: string, next: string): Promise<void> {
  return call(() => {
    const u = db.users.find((x) => x.id === userId);
    if (!u || u.password !== current) throw new ApiError("Joriy parol noto'g'ri", 'current');
    u.password = next;
  });
}

// ============ Tuzilma ============
export interface Structure {
  faculties: Faculty[];
  departments: Department[];
  directions: StudyDirection[];
  groups: Group[];
}
export function getStructure(): Promise<Structure> {
  return call(() => ({ faculties: db.faculties, departments: db.departments, directions: db.directions, groups: db.groups }));
}
export type UnitKind = 'faculty' | 'department' | 'direction' | 'group';
export function saveUnit(kind: UnitKind, data: Partial<Faculty & Department & StudyDirection & Group>): Promise<void> {
  return call(() => {
    const list = { faculty: db.faculties, department: db.departments, direction: db.directions, group: db.groups }[kind] as { id: string }[];
    if (data.id) {
      const it = list.find((x) => x.id === data.id);
      if (it) Object.assign(it, data);
    } else {
      list.push({ ...data, id: uid(kind[0]) } as { id: string });
    }
  });
}
export function deleteUnit(kind: UnitKind, id: string): Promise<void> {
  return call(() => {
    const has =
      kind === 'faculty'
        ? db.students.some((s) => s.facultyId === id) || db.teachers.some((t) => db.departments.find((d) => d.id === t.departmentId)?.facultyId === id)
        : kind === 'department'
          ? db.students.some((s) => s.departmentId === id) || db.teachers.some((t) => t.departmentId === id)
          : kind === 'direction'
            ? db.students.some((s) => s.directionId === id)
            : db.students.some((s) => s.groupId === id);
    if (has) throw new ApiError("Bu bo'linmada xodimlar yoki talabalar mavjud. Avval ularni boshqa bo'linmaga o'tkazing.");
    const remove = <T extends { id: string }>(arr: T[], pred: (x: T) => boolean) => {
      for (let i = arr.length - 1; i >= 0; i--) if (pred(arr[i])) arr.splice(i, 1);
    };
    if (kind === 'faculty') {
      const deps = db.departments.filter((d) => d.facultyId === id).map((d) => d.id);
      const dirs = db.directions.filter((d) => deps.includes(d.departmentId)).map((d) => d.id);
      remove(db.groups, (g) => dirs.includes(g.directionId));
      remove(db.directions, (d) => dirs.includes(d.id));
      remove(db.departments, (d) => deps.includes(d.id));
      remove(db.faculties, (f) => f.id === id);
    } else if (kind === 'department') {
      const dirs = db.directions.filter((d) => d.departmentId === id).map((d) => d.id);
      remove(db.groups, (g) => dirs.includes(g.directionId));
      remove(db.directions, (d) => dirs.includes(d.id));
      remove(db.departments, (d) => d.id === id);
    } else if (kind === 'direction') {
      remove(db.groups, (g) => g.directionId === id);
      remove(db.directions, (d) => d.id === id);
    } else remove(db.groups, (g) => g.id === id);
  });
}

// ============ Umumiy tekshiruvlar ============
function checkTurnstileId(code: string, selfType: PersonType, selfId?: string) {
  if (!code) return;
  const t = db.teachers.find((x) => x.turnstileId === code && !(selfType === 'teacher' && x.id === selfId));
  const s = db.students.find((x) => x.turnstileId === code && !(selfType === 'student' && x.id === selfId));
  if (t || s) throw new ApiError('Bu Turniket ID boshqa xodimga biriktirilgan', 'turnstileId');
}

// ============ O'qituvchilar ============
export type TeacherInput = Omit<Teacher, 'id'>;
export function getTeachers(): Promise<Teacher[]> {
  return call(() => db.teachers);
}
export function getTeacher(id: string): Promise<Teacher | null> {
  return call(() => db.teachers.find((t) => t.id === id) ?? null);
}
export function addTeacher(data: TeacherInput): Promise<Teacher> {
  return call(() => {
    if (db.teachers.some((t) => t.jshshir === data.jshshir)) throw new ApiError("Bu JSHSHIR bilan o'qituvchi allaqachon mavjud", 'jshshir');
    checkTurnstileId(data.turnstileId, 'teacher');
    const t: Teacher = { ...data, id: uid('t') };
    db.teachers.unshift(t);
    return t;
  });
}
export function updateTeacher(id: string, data: TeacherInput): Promise<Teacher> {
  return call(() => {
    if (db.teachers.some((t) => t.jshshir === data.jshshir && t.id !== id)) throw new ApiError("Bu JSHSHIR bilan o'qituvchi allaqachon mavjud", 'jshshir');
    checkTurnstileId(data.turnstileId, 'teacher', id);
    const t = db.teachers.find((x) => x.id === id);
    if (!t) throw new ApiError("O'qituvchi topilmadi");
    Object.assign(t, data);
    return t;
  });
}
export function deleteTeacher(id: string): Promise<void> {
  return call(() => {
    const i = db.teachers.findIndex((t) => t.id === id);
    if (i >= 0) db.teachers.splice(i, 1);
  });
}
export function setTeacherActive(id: string, active: boolean): Promise<void> {
  return call(() => {
    const t = db.teachers.find((x) => x.id === id);
    if (t) t.active = active;
  });
}

// ============ Talabalar ============
export type StudentInput = Omit<Student, 'id'>;
export function getStudents(): Promise<Student[]> {
  return call(() => db.students);
}
export function getStudent(id: string): Promise<Student | null> {
  return call(() => db.students.find((s) => s.id === id) ?? null);
}
export function addStudent(data: StudentInput): Promise<Student> {
  return call(() => {
    if (db.students.some((s) => s.jshshir === data.jshshir)) throw new ApiError('Bu JSHSHIR bilan talaba allaqachon mavjud', 'jshshir');
    if (db.students.some((s) => s.studentId === data.studentId)) throw new ApiError('Bu Talaba ID allaqachon mavjud', 'studentId');
    checkTurnstileId(data.turnstileId, 'student');
    const s: Student = { ...data, id: uid('s') };
    db.students.unshift(s);
    return s;
  });
}
export function updateStudent(id: string, data: StudentInput): Promise<Student> {
  return call(() => {
    if (db.students.some((s) => s.jshshir === data.jshshir && s.id !== id)) throw new ApiError('Bu JSHSHIR bilan talaba allaqachon mavjud', 'jshshir');
    if (db.students.some((s) => s.studentId === data.studentId && s.id !== id)) throw new ApiError('Bu Talaba ID allaqachon mavjud', 'studentId');
    checkTurnstileId(data.turnstileId, 'student', id);
    const s = db.students.find((x) => x.id === id);
    if (!s) throw new ApiError('Talaba topilmadi');
    Object.assign(s, data);
    return s;
  });
}
export function deleteStudents(ids: string[]): Promise<void> {
  return call(() => {
    for (let i = db.students.length - 1; i >= 0; i--) if (ids.includes(db.students[i].id)) db.students.splice(i, 1);
  });
}
export function changeStudentsGroup(ids: string[], groupId: string): Promise<void> {
  return call(() => {
    const g = db.groups.find((x) => x.id === groupId)!;
    const dir = db.directions.find((d) => d.id === g.directionId)!;
    const dep = db.departments.find((d) => d.id === dir.departmentId)!;
    for (const s of db.students)
      if (ids.includes(s.id)) Object.assign(s, { groupId, directionId: dir.id, departmentId: dep.id, facultyId: dep.facultyId, course: g.course, studyForm: g.studyForm });
  });
}
export function promoteStudents(ids: string[]): Promise<{ moved: number; skipped: number }> {
  return call(() => {
    let moved = 0;
    let skipped = 0;
    for (const s of db.students) {
      if (!ids.includes(s.id)) continue;
      if (s.course === 4 || s.course === 6) {
        skipped++;
        continue;
      }
      const next = (s.course + 1) as Course;
      s.course = next;
      const g = db.groups.find((x) => x.directionId === s.directionId && x.course === next && x.studyForm === s.studyForm);
      if (g) s.groupId = g.id;
      moved++;
    }
    return { moved, skipped };
  });
}

export function importTeachers(rows: TeacherInput[]): Promise<number> {
  return call(() => {
    rows.forEach((r) => db.teachers.push({ ...r, id: uid('t') }));
    return rows.length;
  });
}
export function importStudents(rows: StudentInput[]): Promise<number> {
  return call(() => {
    rows.forEach((r) => db.students.push({ ...r, id: uid('s') }));
    return rows.length;
  });
}

// ============ Davomat ============
export function getTeacherAttendance(f: AttendanceFilters): Promise<{ rows: TeacherAttendanceRow[]; summary: ReturnType<typeof eng.summarize> }> {
  return call(() => eng.teacherRows(f));
}
export function getStudentAttendance(f: AttendanceFilters): Promise<{ rows: StudentAttendanceRow[]; summary: ReturnType<typeof eng.summarize> }> {
  return call(() => eng.studentRows(f));
}
export function getPersonDay(type: PersonType, id: string, date: string): Promise<AttendanceRow> {
  return call(() => eng.computeRow(type, id, date));
}
export interface MonthAttendance {
  rows: (AttendanceRow & { holiday: string | null })[];
  cameDays: number;
  lateDays: number;
  absentDays: number;
  totalMinutes: number;
  avgArrival: number | null; // daqiqa
}
export function getPersonMonth(type: PersonType, id: string, year: number, month0: number): Promise<MonthAttendance> {
  return call(() => {
    const days = Array.from({ length: daysInMonth(year, month0) }, (_, i) => `${year}-${String(month0 + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`);
    const rows = days.map((d) => ({ ...eng.computeRow(type, id, d), holiday: eng.holidayName(d) }));
    const came = rows.filter((r) => r.arrival);
    const live = (r: AttendanceRow) => r.workedMinutes + (r.openSince ? (Date.now() - new Date(r.openSince).getTime()) / 60000 : 0);
    return {
      rows,
      cameDays: came.length,
      lateDays: rows.filter((r) => r.status === 'kechikdi').length,
      absentDays: rows.filter((r) => r.status === 'kelmadi').length,
      totalMinutes: Math.round(came.reduce((a, r) => a + live(r), 0)),
      avgArrival: came.length ? Math.round(came.reduce((a, r) => a + minutesOfDay(r.arrival!), 0) / came.length) : null,
    };
  });
}
export function getPersonPasses(type: PersonType, id: string): Promise<(PassEvent & { turnstileName: string })[]> {
  return call(() => {
    const out: (PassEvent & { turnstileName: string })[] = [];
    const today = todayISO();
    for (let i = 0; i < 31; i++) {
      for (const e of eng.eventsFor(type, id, addDays(today, -i))) out.push({ ...e, turnstileName: db.turnstiles.find((t) => t.id === e.turnstileId)?.name ?? '—' });
    }
    return out.sort((a, b) => b.time.localeCompare(a.time));
  });
}
export function setAbsenceReason(type: PersonType, id: string, date: string, reason: AbsenceReason): Promise<void> {
  return call(() => {
    db.reasons.set(db.evKey(type, id, date), reason);
  });
}

// ============ Bosh sahifa ============
type Metric = 'keldi' | 'kechikdi' | 'kelmadi' | 'binoda';
const METRICS: Metric[] = ['keldi', 'kechikdi', 'kelmadi', 'binoda'];
function blockStats(type: PersonType) {
  const days = eng.lastWorkdays(7);
  const today = todayISO();
  const sums = days.map((d) => eng.daySummary(type, d));
  const cur = eng.daySummary(type, today);
  const prev = sums.length >= 2 ? sums[sums.length - (days[days.length - 1] === today ? 2 : 1)] : cur;
  const trend = Object.fromEntries(METRICS.map((m) => [m, cur[m] - prev[m]])) as Record<Metric, number>;
  const spark = Object.fromEntries(METRICS.map((m) => [m, sums.map((s) => s[m])])) as Record<Metric, number[]>;
  return { ...cur, trend, spark };
}
export function getDashboardStats() {
  return call(() => ({ teachers: blockStats('teacher'), students: blockStats('student') }));
}
export function getWeekly(type: PersonType) {
  return call(() =>
    eng.lastWorkdays(7).map((date) => {
      const s = eng.daySummary(type, date);
      return { date, keldi: s.keldi, kechikdi: s.kechikdi, kelmadi: s.kelmadi };
    }),
  );
}
export function getTodaySummary(type: PersonType) {
  return call(() => eng.daySummary(type, todayISO()));
}
export function getDepartmentAttendance() {
  return call(() => {
    const today = todayISO();
    return db.departments.map((d) => {
      const ts = db.teachers.filter((t) => t.active && t.departmentId === d.id).map((t) => eng.computeRow('teacher', t.id, today));
      const ss = db.students.filter((s) => s.active && s.departmentId === d.id).map((s) => eng.computeRow('student', s.id, today));
      const all = [...ts, ...ss].filter((r) => r.status !== 'dam' && r.status !== 'kelajak');
      const came = all.filter((r) => r.arrival).length;
      return { id: d.id, name: d.name.replace(' kafedrasi', ''), percent: all.length ? Math.round((came / all.length) * 100) : 0 };
    });
  });
}
export function getTodayLate(type: 'teacher'): Promise<TeacherAttendanceRow[]>;
export function getTodayLate(type: 'student'): Promise<StudentAttendanceRow[]>;
export function getTodayLate(type: PersonType) {
  return call(() => {
    const f = { from: todayISO(), to: todayISO(), status: 'kechikdi' as const };
    const rows = type === 'teacher' ? eng.teacherRows(f).rows : eng.studentRows(f).rows;
    return rows.sort((a, b) => b.arrival!.localeCompare(a.arrival!)).slice(0, 6);
  });
}
export function getTodayAbsent(type: 'teacher'): Promise<TeacherAttendanceRow[]>;
export function getTodayAbsent(type: 'student'): Promise<StudentAttendanceRow[]>;
export function getTodayAbsent(type: PersonType) {
  return call(() => {
    const f = { from: todayISO(), to: todayISO(), status: 'kelmadi' as const };
    const rows = type === 'teacher' ? eng.teacherRows(f).rows : eng.studentRows(f).rows;
    return rows.slice(0, 6);
  });
}

// ============ Jonli o'tishlar ============
function decorate(e: PassEvent): LivePass {
  const p = e.personType && e.personId ? eng.personLabel(e.personType, e.personId) : null;
  return { ...e, fullName: p?.fullName ?? null, photo: p?.photo ?? null, turnstileName: db.turnstiles.find((t) => t.id === e.turnstileId)?.name ?? '—' };
}
export function getLiveFeed(limit = 10): Promise<LivePass[]> {
  return call(() => {
    const today = todayISO();
    const out: PassEvent[] = [];
    for (const [k, list] of db.events) if (k.endsWith(today)) out.push(...list);
    return out.sort((a, b) => b.time.localeCompare(a.time)).slice(0, limit).map(decorate);
  });
}

const liveListeners = new Set<(p: LivePass) => void>();
let liveTimer: ReturnType<typeof setInterval> | null = null;
function simulatePass(): LivePass | null {
  const today = todayISO();
  const online = db.turnstiles.filter((t) => t.online);
  if (!online.length) return null;
  const isTeacher = Math.random() < 0.3;
  const pool = isTeacher ? db.teachers.filter((t) => t.active && t.turnstileId) : db.students.filter((s) => s.active);
  const person = pool[Math.floor(Math.random() * pool.length)];
  const type: PersonType = isTeacher ? 'teacher' : 'student';
  const row = eng.computeRow(type, person.id, today);
  const tr = online[Math.floor(Math.random() * online.length)];
  const e: PassEvent = {
    id: db.nextEventId(),
    time: new Date().toISOString(),
    turnstileId: tr.id,
    direction: row.inside ? 'out' : 'in',
    personType: type,
    personId: person.id,
    code: person.turnstileId,
  };
  const key = db.evKey(type, person.id, today);
  db.events.set(key, [...(db.events.get(key) ?? []), e]);
  tr.lastSignal = e.time;
  return decorate(e);
}
/** Jonli o'tishlarga obuna (mock: har 15 soniyada yangi o'tish). Backendda WebSocket bilan almashtiriladi. */
export function subscribeLive(cb: (p: LivePass) => void): () => void {
  liveListeners.add(cb);
  if (!liveTimer) {
    liveTimer = setInterval(() => {
      if (offline) return;
      const p = simulatePass();
      if (p) liveListeners.forEach((l) => l(structuredClone(p)));
    }, 15000);
  }
  return () => {
    liveListeners.delete(cb);
    if (!liveListeners.size && liveTimer) {
      clearInterval(liveTimer);
      liveTimer = null;
    }
  };
}

// ============ Turniketlar ============
export function getTurnstiles(): Promise<(Turnstile & { todayPasses: number })[]> {
  return call(() => {
    const today = todayISO();
    const counts: Record<string, number> = {};
    for (const [k, list] of db.events) if (k.endsWith(today)) for (const e of list) counts[e.turnstileId] = (counts[e.turnstileId] ?? 0) + 1;
    for (const e of db.unlinked) counts[e.turnstileId] = (counts[e.turnstileId] ?? 0) + 1;
    return db.turnstiles.map((t) => ({ ...t, todayPasses: (counts[t.id] ?? 0) }));
  });
}
export function saveTurnstile(data: Partial<Turnstile>): Promise<void> {
  return call(() => {
    if (data.id) {
      const t = db.turnstiles.find((x) => x.id === data.id);
      if (t) Object.assign(t, data);
    } else {
      db.turnstiles.push({ id: uid('tr'), name: data.name!, location: data.location!, ip: data.ip!, mode: data.mode ?? 'both', online: true, lastSignal: new Date().toISOString() });
    }
  });
}
export function deleteTurnstile(id: string): Promise<void> {
  return call(() => {
    const i = db.turnstiles.findIndex((t) => t.id === id);
    if (i >= 0) db.turnstiles.splice(i, 1);
  });
}
export function getUnlinkedPasses(): Promise<(PassEvent & { turnstileName: string })[]> {
  return call(() =>
    db.unlinked
      .slice()
      .sort((a, b) => b.time.localeCompare(a.time))
      .map((e) => ({ ...e, turnstileName: db.turnstiles.find((t) => t.id === e.turnstileId)?.name ?? '—' })),
  );
}
export function linkPass(passId: string, type: PersonType, personId: string): Promise<void> {
  return call(() => {
    const i = db.unlinked.findIndex((e) => e.id === passId);
    if (i < 0) throw new ApiError("O'tish topilmadi");
    const e = db.unlinked[i];
    db.unlinked.splice(i, 1);
    const date = toISODate(new Date(e.time));
    const key = db.evKey(type, personId, date);
    const linked: PassEvent = { ...e, personType: type, personId };
    db.events.set(key, [...(db.events.get(key) ?? []), linked]);
    // Agar shaxsda Turniket ID bo'lmasa — shu raqamni biriktiramiz
    const person = type === 'teacher' ? db.teachers.find((t) => t.id === personId) : db.students.find((s) => s.id === personId);
    if (person && !person.turnstileId) person.turnstileId = e.code;
  });
}

// ============ Sozlamalar ============
export function getSettings(): Promise<Settings> {
  return call(() => db.settings);
}
export function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  return call(() => Object.assign(db.settings, patch));
}
export function addHoliday(h: Omit<Holiday, 'id'>): Promise<void> {
  return call(() => {
    db.settings.holidays.push({ ...h, id: uid('h') });
    db.settings.holidays.sort((a, b) => a.date.slice(5).localeCompare(b.date.slice(5)));
  });
}
export function deleteHoliday(id: string): Promise<void> {
  return call(() => {
    db.settings.holidays = db.settings.holidays.filter((h) => h.id !== id);
  });
}

// ============ Foydalanuvchilar ============
export function getUsers(): Promise<User[]> {
  return call(() => db.users.map(stripPwd));
}
export function saveUser(data: { id?: string; fullName: string; login: string; password?: string; role: Role }): Promise<void> {
  return call(() => {
    if (db.users.some((u) => u.login === data.login && u.id !== data.id)) throw new ApiError('Bu login band', 'login');
    if (data.id) {
      const u = db.users.find((x) => x.id === data.id);
      if (u) Object.assign(u, { fullName: data.fullName, login: data.login, role: data.role });
    } else {
      db.users.push({ id: uid('u'), fullName: data.fullName, login: data.login, password: data.password ?? '', role: data.role, active: true, lastLogin: null });
    }
  });
}
export function resetUserPassword(id: string, password: string): Promise<void> {
  return call(() => {
    const u = db.users.find((x) => x.id === id);
    if (u) u.password = password;
  });
}
export function setUserActive(id: string, active: boolean): Promise<void> {
  return call(() => {
    const u = db.users.find((x) => x.id === id);
    if (u) u.active = active;
  });
}
export function deleteUser(id: string): Promise<void> {
  return call(() => {
    const i = db.users.findIndex((u) => u.id === id);
    if (i >= 0) db.users.splice(i, 1);
  });
}

// ============ Bildirishnomalar ============
const readNotifs = new Set<string>();
export function getNotifications(): Promise<Notification[]> {
  return call(() => {
    const out: Notification[] = [];
    const late = eng.daySummary('teacher', todayISO()).kechikdi;
    if (late) out.push({ id: `late-${todayISO()}-${late}`, text: `Bugun ${late} nafar o'qituvchi kechikdi`, link: '/oqituvchilar-davomati?holat=kechikdi', kind: 'info', read: false });
    return out.map((n) => ({ ...n, read: readNotifs.has(n.id) }));
  });
}
export function markNotificationsRead(ids: string[]): Promise<void> {
  return call(() => {
    ids.forEach((i) => readNotifs.add(i));
  });
}

// ============ Qidiruv ============
export function searchPeople(q: string): Promise<SearchResult[]> {
  return call(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const out: SearchResult[] = [];
    for (const t of db.teachers) {
      if (fullName(t).toLowerCase().includes(s) || t.turnstileId.includes(s))
        out.push({ type: 'teacher', id: t.id, fullName: fullName(t), sub: db.departments.find((d) => d.id === t.departmentId)?.name ?? '', photo: t.photo });
    }
    for (const st of db.students) {
      if (fullName(st).toLowerCase().includes(s) || st.studentId.includes(s) || st.turnstileId.includes(s))
        out.push({ type: 'student', id: st.id, fullName: fullName(st), sub: db.groups.find((g) => g.id === st.groupId)?.name ?? '', photo: st.photo });
    }
    return out.slice(0, 8);
  });
}

// ============ Hisobotlar ============
export interface TimesheetCell {
  date: string;
  kind: 'work' | 'late' | 'absent' | 'off' | 'future';
  hours: number;
}
export interface TimesheetRow {
  teacher: Teacher;
  cells: TimesheetCell[];
  workDays: number;
  cameDays: number;
  lateCount: number;
  absentCount: number;
  totalHours: number;
}
export function getTimesheet(year: number, month0: number, departmentId?: string): Promise<{ days: { date: string; off: boolean }[]; rows: TimesheetRow[] }> {
  return call(() => {
    const today = todayISO();
    const dates = Array.from({ length: daysInMonth(year, month0) }, (_, i) => `${year}-${String(month0 + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`);
    const days = dates.map((date) => ({ date, off: eng.isDayOff(date) }));
    const rows = db.teachers
      .filter((t) => t.active && (!departmentId || t.departmentId === departmentId))
      .map((t) => {
        const cells: TimesheetCell[] = dates.map((date) => {
          if (date > today) return { date, kind: 'future', hours: 0 };
          const r = eng.computeRow('teacher', t.id, date);
          const live = r.openSince ? (Date.now() - new Date(r.openSince).getTime()) / 60000 : 0;
          const hours = Math.round(((r.workedMinutes + live) / 60) * 10) / 10;
          if (r.status === 'dam') return { date, kind: 'off', hours: 0 };
          if (r.status === 'kelmadi') return { date, kind: 'absent', hours: 0 };
          return { date, kind: r.status === 'kechikdi' ? 'late' : 'work', hours };
        });
        return {
          teacher: t,
          cells,
          workDays: days.filter((d) => !d.off).length,
          cameDays: cells.filter((c) => c.kind === 'work' || c.kind === 'late').length,
          lateCount: cells.filter((c) => c.kind === 'late').length,
          absentCount: cells.filter((c) => c.kind === 'absent').length,
          totalHours: Math.round(cells.reduce((a, c) => a + c.hours, 0) * 10) / 10,
        };
      });
    return { days, rows };
  });
}

export interface GroupReportRow {
  group: Group;
  directionName: string;
  count: number;
  percent: number;
  late: number;
  absent: number;
  students: { student: Student; percent: number; late: number; absent: number }[];
}
export function getGroupReport(f: { from: string; to: string; facultyId?: string; departmentId?: string; groupId?: string }): Promise<GroupReportRow[]> {
  return call(() => {
    const days = daysBetween(f.from, f.to).filter((d) => !eng.isDayOff(d) && d <= todayISO());
    return db.groups
      .filter((g) => (!f.groupId || g.id === f.groupId))
      .map((g) => {
        const dir = db.directions.find((d) => d.id === g.directionId);
        const dep = db.departments.find((d) => d.id === dir?.departmentId);
        if (f.departmentId && dep?.id !== f.departmentId) return null;
        if (f.facultyId && dep?.facultyId !== f.facultyId) return null;
        const studs = db.students.filter((s) => s.active && s.groupId === g.id).map((s) => {
          const rows = days.map((d) => eng.computeRow('student', s.id, d));
          const came = rows.filter((r) => r.arrival).length;
          return { student: s, percent: days.length ? Math.round((came / days.length) * 100) : 0, late: rows.filter((r) => r.status === 'kechikdi').length, absent: rows.filter((r) => r.status === 'kelmadi').length };
        });
        if (!studs.length) return null;
        return {
          group: g,
          directionName: dir?.name ?? '',
          count: studs.length,
          percent: Math.round(studs.reduce((a, s) => a + s.percent, 0) / studs.length),
          late: studs.reduce((a, s) => a + s.late, 0),
          absent: studs.reduce((a, s) => a + s.absent, 0),
          students: studs.sort((a, b) => a.percent - b.percent),
        };
      })
      .filter(Boolean) as GroupReportRow[];
  });
}

function personSub(type: PersonType, p: Teacher | Student) {
  if (type === 'teacher') return db.departments.find((d) => d.id === (p as Teacher).departmentId)?.name ?? '';
  return db.groups.find((g) => g.id === (p as Student).groupId)?.name ?? '';
}
export interface LateReportRow {
  id: string;
  type: PersonType;
  fullName: string;
  sub: string;
  count: number;
  totalMinutes: number;
  avgMinutes: number;
}
export function getLateReport(type: PersonType, from: string, to: string): Promise<LateReportRow[]> {
  return call(() => {
    const days = daysBetween(from, to);
    const people: (Teacher | Student)[] = type === 'teacher' ? db.teachers.filter((t) => t.active) : db.students.filter((s) => s.active);
    return people
      .map((p) => {
        const late = days.map((d) => eng.computeRow(type, p.id, d)).filter((r) => r.status === 'kechikdi');
        const total = late.reduce((a, r) => a + r.lateMinutes, 0);
        return { id: p.id, type, fullName: fullName(p), sub: personSub(type, p), count: late.length, totalMinutes: total, avgMinutes: late.length ? Math.round(total / late.length) : 0 };
      })
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count || b.totalMinutes - a.totalMinutes);
  });
}
export interface AbsentReportRow {
  id: string;
  type: PersonType;
  fullName: string;
  sub: string;
  count: number;
  sababli: number;
  sababsiz: number;
}
export function getAbsentReport(type: PersonType, from: string, to: string): Promise<AbsentReportRow[]> {
  return call(() => {
    const days = daysBetween(from, to);
    const people: (Teacher | Student)[] = type === 'teacher' ? db.teachers.filter((t) => t.active) : db.students.filter((s) => s.active);
    return people
      .map((p) => {
        const abs = days.map((d) => eng.computeRow(type, p.id, d)).filter((r) => r.status === 'kelmadi');
        const sababli = abs.filter((r) => r.reason?.type === 'sababli').length;
        return { id: p.id, type, fullName: fullName(p), sub: personSub(type, p), count: abs.length, sababli, sababsiz: abs.length - sababli };
      })
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count);
  });
}

/** Excel shabloni va eksport uchun yordamchi: bugungi qisqa hisobot */
export function getTodayExport() {
  return call(() => {
    const t = eng.daySummary('teacher', todayISO());
    const s = eng.daySummary('student', todayISO());
    return { teachers: t, students: s, generatedAt: isoAt(todayISO(), new Date().getHours() * 60 + new Date().getMinutes()) };
  });
}
