export type Role = 'superadmin' | 'direktor' | 'kadrlar';
export type PersonType = 'teacher' | 'student';
export type Gender = 'erkak' | 'ayol';
export type StudyForm = 'kunduzgi' | 'sirtqi' | 'kechki';
/** 1–4 bakalavr, 5 = Magistratura 1-kurs, 6 = Magistratura 2-kurs */
export type Course = 1 | 2 | 3 | 4 | 5 | 6;
export type Direction = 'in' | 'out';
export type TurnstileMode = 'in' | 'out' | 'both';

/** Asosiy holat (bir-birini istisno qiladi). "Binoda" alohida belgi sifatida yuradi. */
export type AttendanceStatus = 'keldi' | 'kechikdi' | 'kelmadi' | 'dam' | 'kelajak';
export type StatusFilter = '' | 'keldi' | 'kechikdi' | 'kelmadi' | 'binoda';

export interface User {
  id: string;
  fullName: string;
  login: string;
  role: Role;
  active: boolean;
  lastLogin: string | null;
}

export interface Faculty {
  id: string;
  name: string;
}
export interface Department {
  id: string;
  name: string;
  facultyId: string;
}
export interface StudyDirection {
  id: string;
  name: string;
  departmentId: string;
}
export interface Group {
  id: string;
  name: string;
  directionId: string;
  course: Course;
  studyForm: StudyForm;
}

export interface Address {
  region: string;
  district: string;
  address: string;
}

export interface Teacher extends Address {
  id: string;
  photo: string | null;
  lastName: string;
  firstName: string;
  middleName: string;
  birthDate: string;
  gender: Gender;
  phone: string;
  phone2: string;
  passport: string;
  jshshir: string;
  passportIssued: string;
  passportIssuedBy: string;
  passportExpiry: string;
  departmentId: string;
  position: string;
  degree: string;
  hiredDate: string;
  rate: string;
  active: boolean;
  turnstileId: string;
}

export interface Parent {
  fullName: string;
  relation: 'Otasi' | 'Onasi' | 'Vasiy';
  phone: string;
  phone2: string;
}

export interface Student extends Address {
  id: string;
  photo: string | null;
  lastName: string;
  firstName: string;
  middleName: string;
  birthDate: string;
  gender: Gender;
  jshshir: string;
  phone: string;
  parents: Parent[];
  studentId: string;
  facultyId: string;
  departmentId: string;
  directionId: string;
  course: Course;
  groupId: string;
  studyForm: StudyForm;
  admissionYear: string;
  turnstileId: string;
  active: boolean;
}

export interface Turnstile {
  id: string;
  name: string;
  location: string;
  ip: string;
  mode: TurnstileMode;
  online: boolean;
  lastSignal: string; // ISO
}

export interface PassEvent {
  id: string;
  time: string; // ISO
  turnstileId: string;
  direction: Direction;
  personType: PersonType | null;
  personId: string | null;
  code: string; // turniket ID (xodim raqami)
}

export interface AbsenceReason {
  type: 'sababli' | 'sababsiz';
  note: string;
}

export interface AttendanceRow {
  key: string;
  personType: PersonType;
  personId: string;
  date: string; // YYYY-MM-DD
  arrival: string | null; // ISO
  departure: string | null; // ISO
  inside: boolean;
  /** Binoda bo'lsa — oxirgi kirish vaqti (jonli ishlagan vaqtni hisoblash uchun) */
  openSince: string | null;
  status: AttendanceStatus;
  lateMinutes: number;
  workedMinutes: number;
  reason: AbsenceReason | null;
}

export interface TeacherAttendanceRow extends AttendanceRow {
  person: Teacher;
}
export interface StudentAttendanceRow extends AttendanceRow {
  person: Student;
}

export interface AttendanceFilters {
  from: string;
  to: string;
  status?: StatusFilter;
  search?: string;
  departmentId?: string;
  position?: string;
  facultyId?: string;
  directionId?: string;
  course?: string;
  groupId?: string;
}

export interface AttendanceSummary {
  total: number;
  keldi: number;
  kechikdi: number;
  kelmadi: number;
  binoda: number;
  dam: number;
}

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  recurring: boolean;
}

export interface Settings {
  teacherStart: string;
  teacherEnd: string;
  teacherThreshold: number;
  studentStart: string;
  studentThreshold: number;
  weekendDays: number[]; // 0=Yakshanba ... 6=Shanba
  holidays: Holiday[];
  universityName: string;
  shortName: string;
  logo: string | null;
}

export interface Notification {
  id: string;
  text: string;
  link: string;
  kind: 'warning' | 'danger' | 'info';
  read: boolean;
}

export interface SearchResult {
  type: PersonType;
  id: string;
  fullName: string;
  sub: string;
  photo: string | null;
}

export interface DashboardStats {
  teachers: AttendanceSummary & { trend: Record<'keldi' | 'kechikdi' | 'kelmadi' | 'binoda', number>; spark: Record<'keldi' | 'kechikdi' | 'kelmadi' | 'binoda', number[]> };
  students: AttendanceSummary & { trend: Record<'keldi' | 'kechikdi' | 'kelmadi' | 'binoda', number>; spark: Record<'keldi' | 'kechikdi' | 'kelmadi' | 'binoda', number[]> };
}

export interface WeeklyPoint {
  date: string;
  keldi: number;
  kechikdi: number;
  kelmadi: number;
}

export interface LivePass extends PassEvent {
  fullName: string | null;
  photo: string | null;
  turnstileName: string;
}
