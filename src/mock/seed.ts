// Deterministik mock ma'lumotlar generatori. Backend ulanganda bu fayl kerak bo'lmaydi.
import type {
  Course, Department, Faculty, Gender, Group, Holiday, PassEvent, Settings, Student, StudyDirection,
  StudyForm, Teacher, Turnstile, User,
} from '@/types';
import { POSITIONS, formatPhone } from '@/utils/format';
import { addDays, isoAt, todayISO, parseISODate } from '@/utils/date';

// ---------- Tasodifiy sonlar (seed) ----------
let seed = 20261007;
export function rand(): number {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
export const randInt = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
export const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const digits = (n: number) => Array.from({ length: n }, () => randInt(0, 9)).join('');

// ---------- Ismlar ----------
const MALE = ['Jamshid', 'Sardor', 'Bekzod', 'Otabek', 'Jasur', 'Sherzod', 'Akmal', 'Dilshod', 'Farrux', 'Rustam', 'Javohir', 'Bobur', 'Shoxrux', "Ulug'bek", 'Islom', 'Aziz', 'Doniyor', 'Sanjar', 'Nodir', 'Temur', 'Abdulla', 'Muhammadali', 'Elyor', 'Behruz', 'Asilbek', 'Xurshid', 'Zafar', 'Ravshan', 'Komil', 'Lochin', 'Sirojiddin', 'Shohjahon'];
const FEMALE = ['Munira', 'Sitora', 'Dilnoza', 'Nilufar', 'Gulnora', 'Madina', 'Malika', 'Shahnoza', 'Zarina', 'Kamola', 'Feruza', 'Mohira', 'Nodira', 'Dildora', 'Sevara', 'Gulbahor', 'Maftuna', 'Shoira', 'Iroda', 'Yulduz', 'Barno', 'Zuhra', 'Aziza', 'Charos', 'Muxlisa', 'Gulshan'];
const SURNAMES = ['Astanov', 'Fayzullayev', 'Axadov', 'Karimov', 'Rahimov', 'Tursunov', 'Yusupov', 'Qodirov', 'Ergashev', 'Xolmatov', 'Normatov', 'Abdullayev', 'Mirzayev', 'Sobirov', 'Hamroyev', "Jo'rayev", 'Boboyev', 'Islomov', 'Usmonov', 'Nurmatov', 'Saidov', 'Shodiyev', "Toshpo'latov", "Ro'ziyev", 'Murodov', 'Hasanov', 'Qurbonov', 'Safarov', 'Aliyev', 'Eshonqulov', 'Berdiyev', 'Choriyev', 'Xudoyberdiyev', 'Tog\'ayev', 'Mamatqulov'];
const FATHERS_FORMAL = ['Islom', 'Bahodir', 'Anvar', 'Shuhrat', 'Erkin', 'Rustam', 'Akbar', 'Olim', 'Hamid', 'Ravshan', 'Tolib', "G'ayrat", 'Sobir', 'Murod'];
const FATHERS = [...FATHERS_FORMAL, 'Saydillo', 'Qamariddin', 'Nurali', 'Abdurahmon', 'Zokir', 'Mahmud', 'Ibrohim'];

function makeName(gender: Gender, formal: boolean) {
  const sur = pick(SURNAMES);
  const lastName = gender === 'ayol' ? sur + 'a' : sur;
  const firstName = gender === 'ayol' ? pick(FEMALE) : pick(MALE);
  let middleName: string;
  if (formal && rand() < 0.6) {
    const f = pick(FATHERS_FORMAL);
    middleName = f + (gender === 'ayol' ? 'ovna' : 'ovich');
  } else {
    middleName = pick(FATHERS) + (gender === 'ayol' ? ' qizi' : " o'g'li");
  }
  return { lastName, firstName, middleName };
}

const SURX_DISTRICTS = ['Termiz shahri', 'Denov tumani', 'Sherobod tumani', "Jarqo'rg'on tumani", "Sho'rchi tumani", "Qumqo'rg'on tumani", 'Boysun tumani', 'Angor tumani', 'Muzrabot tumani', 'Sariosiyo tumani'];
const STREETS = ['Mustaqillik', 'Amir Temur', 'Navoiy', 'Bobur', "At-Termiziy", 'Alpomish', 'Istiqlol', "Do'stlik", 'Yangi hayot', 'Bunyodkor'];
function makeAddress() {
  const r = rand();
  if (r < 0.85) return { region: 'Surxondaryo viloyati', district: pick(SURX_DISTRICTS), address: `${pick(STREETS)} ko'chasi, ${randInt(1, 120)}-uy` };
  if (r < 0.93) return { region: 'Qashqadaryo viloyati', district: pick(['Qarshi shahri', 'Shahrisabz tumani', "G'uzor tumani"]), address: `${pick(STREETS)} ko'chasi, ${randInt(1, 80)}-uy` };
  return { region: 'Toshkent shahri', district: pick(['Chilonzor tumani', 'Yunusobod tumani', "Mirzo Ulug'bek tumani"]), address: `${pick(STREETS)} ko'chasi, ${randInt(1, 60)}-uy, ${randInt(1, 90)}-xonadon` };
}
const phone = () => formatPhone(pick(['90', '91', '93', '94', '97', '99', '88', '33', '95']) + digits(7));
const passport = () => pick(['AA', 'AB', 'AC', 'AD', 'AE']) + digits(7);
function jshshir(gender: Gender, birth: string, century2000: boolean) {
  const g = century2000 ? (gender === 'erkak' ? 5 : 6) : gender === 'erkak' ? 3 : 4;
  const [y, m, d] = birth.split('-');
  return `${g}${d}${m}${y.slice(2)}${digits(7)}`;
}
const dateBetween = (y1: number, y2: number) => `${randInt(y1, y2)}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`;

// ---------- Tuzilma ----------
export const faculties: Faculty[] = [
  { id: 'f1', name: 'Axborot texnologiyalari fakulteti' },
  { id: 'f2', name: 'Iqtisodiyot fakulteti' },
  { id: 'f3', name: 'Pedagogika va filologiya fakulteti' },
];
export const departments: Department[] = [
  { id: 'k1', name: 'Axborot texnologiyalari kafedrasi', facultyId: 'f1' },
  { id: 'k2', name: 'Kompyuter injiniringi kafedrasi', facultyId: 'f1' },
  { id: 'k3', name: 'Amaliy matematika kafedrasi', facultyId: 'f1' },
  { id: 'k4', name: 'Iqtisodiyot kafedrasi', facultyId: 'f2' },
  { id: 'k5', name: 'Buxgalteriya hisobi va audit kafedrasi', facultyId: 'f2' },
  { id: 'k6', name: 'Pedagogika va psixologiya kafedrasi', facultyId: 'f3' },
  { id: 'k7', name: "O'zbek tili va adabiyoti kafedrasi", facultyId: 'f3' },
  { id: 'k8', name: 'Xorijiy tillar kafedrasi', facultyId: 'f3' },
];
const DIRS: [string, string, string][] = [
  ['d1', 'Axborot tizimlari va texnologiyalari', 'k1'],
  ['d2', 'Dasturiy injiniring', 'k1'],
  ['d3', 'Kompyuter injiniringi', 'k2'],
  ['d4', 'Amaliy matematika', 'k3'],
  ['d5', 'Iqtisodiyot', 'k4'],
  ['d6', 'Buxgalteriya hisobi va audit', 'k5'],
  ['d7', 'Pedagogika va psixologiya', 'k6'],
  ['d8', "Boshlang'ich ta'lim", 'k6'],
  ['d9', "O'zbek tili va adabiyoti", 'k7'],
  ['d10', 'Xorijiy til va adabiyoti (ingliz tili)', 'k8'],
];
const CODES: Record<string, string> = { d1: 'AT', d2: 'DI', d3: 'KI', d4: 'AM', d5: 'IQ', d6: 'BH', d7: 'PP', d8: 'BT', d9: 'OT', d10: 'XT' };
export const directions: StudyDirection[] = DIRS.map(([id, name, departmentId]) => ({ id, name, departmentId }));

export const groups: Group[] = [];
const YEAR_BY_COURSE: Record<number, number> = { 1: 26, 2: 25, 3: 24, 4: 23, 5: 26, 6: 25 };
for (const d of directions) {
  for (const c of [1, 2, 3, 4] as Course[]) {
    groups.push({ id: `g-${d.id}-${c}`, name: `${CODES[d.id]}-${YEAR_BY_COURSE[c]}-01`, directionId: d.id, course: c, studyForm: 'kunduzgi' });
  }
}
groups.push({ id: 'g-d5-5', name: 'IQ-M-26-01', directionId: 'd5', course: 5, studyForm: 'kunduzgi' });
groups.push({ id: 'g-d1-6', name: 'AT-M-25-01', directionId: 'd1', course: 6, studyForm: 'kunduzgi' });
groups.push({ id: 'g-d6-2s', name: 'BH-25-02S', directionId: 'd6', course: 2, studyForm: 'sirtqi' });
groups.push({ id: 'g-d9-1k', name: 'OT-26-02K', directionId: 'd9', course: 1, studyForm: 'kechki' });

// ---------- O'qituvchilar ----------
export const teachers: Teacher[] = [];
// Spec'dagi namunaviy ismlar birinchi bo'lib keladi
const FIXED_T: [string, string, string, Gender][] = [
  ['Astanova', 'Munira', 'Islamovna', 'ayol'],
  ['Fayzullayev', 'Jamshid', "Saydillo o'g'li", 'erkak'],
  ['Axadova', 'Sitora', 'Qamariddin qizi', 'ayol'],
];
for (let i = 0; i < 40; i++) {
  const gender: Gender = i < 3 ? FIXED_T[i][3] : rand() < 0.45 ? 'ayol' : 'erkak';
  const n = i < 3 ? { lastName: FIXED_T[i][0], firstName: FIXED_T[i][1], middleName: FIXED_T[i][2] } : makeName(gender, true);
  const dep = departments[i % departments.length];
  const pos = i < 8 ? 'Kafedra mudiri' : pick(POSITIONS.slice(1));
  const birth = dateBetween(1962, 1996);
  const issued = dateBetween(2017, 2024);
  const [iy, im, id] = issued.split('-');
  teachers.push({
    id: `t${i + 1}`,
    photo: null,
    ...n,
    birthDate: birth,
    gender,
    phone: phone(),
    phone2: rand() < 0.3 ? phone() : '',
    passport: passport(),
    jshshir: jshshir(gender, birth, false),
    passportIssued: issued,
    passportIssuedBy: pick(['Termiz shahar IIB', 'Denov tuman IIB', 'Sherobod tuman IIB', 'Qarshi shahar IIB', "Jarqo'rg'on tuman IIB"]),
    passportExpiry: `${Number(iy) + 10}-${im}-${id}`,
    ...makeAddress(),
    departmentId: dep.id,
    position: pos,
    degree: pos === 'Professor' ? pick(['DSc', 'Fan doktori']) : pos === 'Dotsent' || pos === 'Kafedra mudiri' ? pick(['PhD', 'Fan nomzodi', 'DSc']) : pick(["Yo'q", "Yo'q", 'PhD']),
    hiredDate: dateBetween(2005, 2025),
    rate: pick(['1,0', '1,0', '1,0', '1,25', '1,5', '0,5', '0,75']),
    active: i !== 37,
    turnstileId: i === 15 || i === 33 ? '' : String(1001 + i),
  });
}

// ---------- Talabalar ----------
export const students: Student[] = [];
for (let i = 0; i < 250; i++) {
  const gender: Gender = rand() < 0.5 ? 'ayol' : 'erkak';
  const n = makeName(gender, false);
  const g = groups[i % groups.length];
  const dir = directions.find((d) => d.id === g.directionId)!;
  const dep = departments.find((d) => d.id === dir.departmentId)!;
  const admYear = 2000 + YEAR_BY_COURSE[g.course];
  const birthYear = admYear - (g.course >= 5 ? randInt(22, 24) : randInt(17, 19));
  const birth = dateBetween(birthYear, birthYear);
  const parentMale = rand() < 0.6;
  const pSur = n.lastName.replace(/a$/, '');
  students.push({
    id: `s${i + 1}`,
    photo: null,
    ...n,
    birthDate: birth,
    gender,
    jshshir: jshshir(gender, birth, birthYear >= 2000),
    phone: phone(),
    ...makeAddress(),
    parents: [
      {
        fullName: parentMale ? `${pSur} ${n.middleName.split(' ')[0]} ${pick(FATHERS)}ovich` : `${pSur}a ${pick(FEMALE)} ${pick(FATHERS_FORMAL)}ovna`,
        relation: parentMale ? 'Otasi' : 'Onasi',
        phone: phone(),
        phone2: rand() < 0.4 ? phone() : '',
      },
    ],
    studentId: `${String(admYear).slice(2)}${String(10000 + i * 37).padStart(5, '0')}`,
    facultyId: dep.facultyId,
    departmentId: dep.id,
    directionId: dir.id,
    course: g.course,
    groupId: g.id,
    studyForm: g.studyForm,
    admissionYear: String(admYear),
    turnstileId: String(20001 + i),
    active: true,
  });
}

// ---------- Turniketlar ----------
const now = new Date();
export const turnstiles: Turnstile[] = [
  { id: 'tr1', name: '1-turniket', location: 'Asosiy kirish', ip: '192.168.10.11', mode: 'both', online: true, lastSignal: now.toISOString() },
  { id: 'tr2', name: '2-turniket', location: 'Asosiy kirish', ip: '192.168.10.12', mode: 'both', online: false, lastSignal: new Date(now.getTime() - 2.3 * 3600e3).toISOString() },
  { id: 'tr3', name: '3-turniket', location: 'Sport zali tomoni', ip: '192.168.10.13', mode: 'both', online: true, lastSignal: now.toISOString() },
  { id: 'tr4', name: '4-turniket', location: 'Xizmat kirishi', ip: '192.168.10.14', mode: 'both', online: true, lastSignal: now.toISOString() },
];

// ---------- Foydalanuvchilar ----------
export const users: (User & { password: string })[] = [
  { id: 'u1', fullName: 'Abdullayev Sardor Bahodirovich', login: 'superadmin', password: 'admin123', role: 'superadmin', active: true, lastLogin: new Date(now.getTime() - 3600e3).toISOString() },
  { id: 'u2', fullName: 'Karimov Rustam Anvarovich', login: 'direktor', password: 'direktor123', role: 'direktor', active: true, lastLogin: new Date(now.getTime() - 26 * 3600e3).toISOString() },
  { id: 'u3', fullName: 'Yusupova Dilnoza Erkinovna', login: 'kadrlar', password: 'kadrlar123', role: 'kadrlar', active: true, lastLogin: new Date(now.getTime() - 5 * 3600e3).toISOString() },
];

// ---------- Sozlamalar ----------
const Y = now.getFullYear();
const HOLIDAYS: [string, string][] = [
  ['01-01', 'Yangi yil'],
  ['03-08', 'Xalqaro xotin-qizlar kuni'],
  ['03-21', "Navro'z bayrami"],
  ['05-09', 'Xotira va qadrlash kuni'],
  ['09-01', 'Mustaqillik kuni'],
  ['10-01', "O'qituvchi va murabbiylar kuni"],
  ['12-08', 'Konstitutsiya kuni'],
];
export const settings: Settings = {
  teacherStart: '08:30',
  teacherEnd: '17:00',
  teacherThreshold: 10,
  studentStart: '08:30',
  studentThreshold: 10,
  weekendDays: [6, 0],
  holidays: HOLIDAYS.map(([md, name], i) => ({ id: `h${i + 1}`, date: `${Y}-${md}`, name, recurring: true })) as Holiday[],
  universityName: 'Termiz davlat universiteti Surxondaryo kampusi',
  shortName: 'TerDU',
  logo: null,
};

export function isDayOffDefault(date: string): boolean {
  const dow = parseISODate(date).getDay();
  if (settings.weekendDays.includes(dow)) return true;
  return settings.holidays.some((h) => (h.recurring ? h.date.slice(5) === date.slice(5) : h.date === date));
}

// ---------- O'tishlar tarixi (30 kun) ----------
export const events = new Map<string, PassEvent[]>();
export const unlinked: PassEvent[] = [];
let evSeq = 0;
export const nextEventId = () => `e${++evSeq}`;
export const evKey = (type: 'teacher' | 'student', id: string, date: string) => `${type}:${id}:${date}`;

const ONLINE_TR = ['tr1', 'tr3', 'tr4', 'tr1', 'tr1'];
function pushEvent(type: 'teacher' | 'student', personId: string, code: string, date: string, minutes: number, dir: 'in' | 'out', nowMs: number) {
  const time = isoAt(date, minutes, randInt(0, 59));
  if (new Date(time).getTime() > nowMs) return false;
  // 2-turniket oflayn bo'lganidan beri undan signal kelmaydi
  const tr = date === todayISO() ? pick(ONLINE_TR) : pick(['tr1', 'tr2', 'tr3', 'tr4', 'tr1']);
  const key = evKey(type, personId, date);
  const list = events.get(key) ?? [];
  list.push({ id: nextEventId(), time, turnstileId: tr, direction: dir, personType: type, personId, code });
  events.set(key, list);
  return true;
}

function generateHistory() {
  const today = todayISO();
  const nowMs = Date.now();
  const days = Array.from({ length: 30 }, (_, i) => addDays(today, i - 29));
  const profiles = new Map<string, { late: number; absent: number }>();
  const prof = (id: string) => {
    if (!profiles.has(id)) profiles.set(id, { late: 0.04 + rand() * 0.2, absent: 0.02 + rand() * 0.09 });
    return profiles.get(id)!;
  };

  for (const date of days) {
    if (isDayOffDefault(date)) continue;
    const isToday = date === today;
    for (const t of teachers) {
      if (!t.turnstileId || !t.active) continue;
      const p = prof(t.id);
      if (rand() < p.absent) continue;
      const late = rand() < p.late;
      const arr = late ? randInt(8 * 60 + 41, 9 * 60 + 35) : randInt(7 * 60 + 40, 8 * 60 + 38);
      if (!pushEvent('teacher', t.id, t.turnstileId, date, arr, 'in', nowMs)) continue;
      if (rand() < 0.3) {
        const lo = randInt(12 * 60 + 30, 13 * 60 + 10);
        if (pushEvent('teacher', t.id, t.turnstileId, date, lo, 'out', nowMs)) {
          if (!pushEvent('teacher', t.id, t.turnstileId, date, lo + randInt(25, 55), 'in', nowMs)) continue;
        } else continue;
      }
      const dep = rand() < 0.12 ? randInt(13 * 60 + 30, 14 * 60 + 30) : randInt(16 * 60 + 40, 18 * 60 + 20);
      pushEvent('teacher', t.id, t.turnstileId, date, isToday && rand() < 0.15 ? 23 * 60 + 50 : dep, 'out', nowMs);
    }
    for (const s of students) {
      const p = prof(s.id);
      if (rand() < p.absent * 1.4) continue;
      const late = rand() < p.late;
      const arr = late ? randInt(8 * 60 + 41, 9 * 60 + 50) : randInt(7 * 60 + 45, 8 * 60 + 39);
      if (!pushEvent('student', s.id, s.turnstileId, date, arr, 'in', nowMs)) continue;
      pushEvent('student', s.id, s.turnstileId, date, randInt(12 * 60 + 20, 16 * 60 + 10), 'out', nowMs);
    }
  }

  // Bog'lanmagan o'tishlar (bugun)
  const codes = ['99871', '1077', '30412', '88003'];
  codes.forEach((code, i) => {
    const d = new Date();
    d.setHours(8, 5 + i * 17, randInt(0, 59), 0);
    if (d.getTime() > nowMs) d.setTime(nowMs - (i + 1) * 7 * 60e3);
    unlinked.push({ id: nextEventId(), time: d.toISOString(), turnstileId: pick(ONLINE_TR), direction: 'in', personType: null, personId: null, code });
  });
}
generateHistory();

/** O'tgan kunlardagi kelmaslik sabablari (Kadrlar bo'limi kiritgan) */
export const reasons = new Map<string, { type: 'sababli' | 'sababsiz'; note: string }>();
(function seedReasons() {
  const today = todayISO();
  for (let i = 1; i < 30; i++) {
    const date = addDays(today, -i);
    if (isDayOffDefault(date)) continue;
    for (const t of teachers) {
      if (!t.turnstileId) continue;
      if (!events.has(evKey('teacher', t.id, date)) && rand() < 0.5) {
        const sababli = rand() < 0.6;
        reasons.set(evKey('teacher', t.id, date), {
          type: sababli ? 'sababli' : 'sababsiz',
          note: sababli ? pick(['Kasallik varaqasi', 'Xizmat safari', 'Malaka oshirish kursi', 'Oilaviy sharoit (ariza asosida)']) : 'Ogohlantirilmagan',
        });
      }
    }
  }
})();

export function randomStudyForm(): StudyForm {
  return pick(['kunduzgi', 'kunduzgi', 'sirtqi', 'kechki']);
}
