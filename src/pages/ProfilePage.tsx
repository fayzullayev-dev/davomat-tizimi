import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, CalendarCheck, CalendarX, Clock, Eye, EyeOff, FileSpreadsheet, History, Info, Pencil, Timer, UserCheck } from 'lucide-react';
import * as api from '@/services/api';
import type { AttendanceRow, PersonType, Student, Teacher } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useChartColors } from '@/context/ThemeContext';
import { useLive, useNow } from '@/context/LiveContext';
import { WEEKDAYS_SHORT, WEEK_MON_FIRST, formatDateTime, formatDayMonth, formatDuration, formatFullDate, formatMonthYear, formatShortDate, formatTime, minutesToHM, parseISODate, todayISO } from '@/utils/date';
import { COURSE_LABELS, STUDY_FORM_LABELS, fullName, maskJshshir, maskPassport } from '@/utils/format';
import { exportExcel } from '@/utils/excel';
import { useAsync, useDocumentTitle, useStructure } from '@/utils/hooks';
import { Avatar, Pill, STATUS_LABEL, StatusBadge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { MonthPicker } from '@/components/ui/DatePicker';
import { Card, EmptyState, ErrorState, Pagination, Skeleton, TableSkeleton, UnderlineTabs } from '@/components/ui/Misc';
import { Tooltip } from '@/components/ui/Tooltip';
import { ReasonBadge, liveWorked } from '@/components/AttendanceBits';

type Tab = 'malumot' | 'davomat' | 'otishlar';

function InfoGrid({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-8">
      {items.map(([k, v]) => (
        <div key={k} className="flex items-start justify-between gap-4 border-b border-border py-3 text-sm">
          <dt className="shrink-0 text-muted">{k}</dt>
          <dd className="text-right font-medium text-text">{v || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

function Secret({ value, mask }: { value: string; mask: (v: string) => string }) {
  const { can } = useAuth();
  const [show, setShow] = useState(false);
  if (!can('viewPassport')) return <span className="tabular">{mask(value)}</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="tabular">{show ? value : mask(value)}</span>
      <IconButton size="sm" label={show ? 'Yashirish' : "Ko'rsatish"} onClick={() => setShow((s) => !s)}>
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </IconButton>
    </span>
  );
}

function MiniStat({ icon, label, value, tone }: { icon: ReactNode; label: string; value: ReactNode; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-border bg-surface p-4">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${tone}`}>{icon}</span>
      <div className="min-w-0">
        <div className="text-lg font-bold text-text tabular">{value}</div>
        <div className="text-xs text-muted">{label}</div>
      </div>
    </div>
  );
}

function dayTooltip(r: AttendanceRow & { holiday: string | null }, now: Date) {
  const d = formatDayMonth(r.date);
  if (r.status === 'dam') return `${d}: ${r.holiday ?? 'Dam olish kuni'}`;
  if (r.status === 'kelajak') return d;
  if (r.status === 'kelmadi') return `${d}: Kelmadi${r.reason ? ` (${r.reason.type === 'sababli' ? 'Sababli' : 'Sababsiz'})` : ''}`;
  return `${d}: Kirish ${formatTime(r.arrival)}, Chiqish ${r.inside ? 'binoda' : formatTime(r.departure)}, Ishlagan: ${formatDuration(liveWorked(r, now))}`;
}

function AttendanceTab({ type, id, name }: { type: PersonType; id: string; name: string }) {
  const now0 = new Date();
  const [ym, setYm] = useState({ y: now0.getFullYear(), m: now0.getMonth() });
  const { tick } = useLive();
  const now = useNow(60000);
  const c = useChartColors();
  const { data, loading, error, reload } = useAsync(() => api.getPersonMonth(type, id, ym.y, ym.m), [ym.y, ym.m, id], { silentDeps: [tick] });
  const isT = type === 'teacher';
  const first = new Date(ym.y, ym.m, 1);
  const offset = (first.getDay() + 6) % 7;
  const color: Record<string, { bg: string; fg: string }> = {
    keldi: { bg: c.keldi, fg: '#fff' },
    kechikdi: { bg: c.kechikdi, fg: '#2a1a00' },
    kelmadi: { bg: c.kelmadi, fg: '#fff' },
  };
  const exportMonth = () =>
    exportExcel(`Davomat_${name.split(' ')[0]}`, [
      {
        name: 'Davomat',
        title: `${name} — ${formatMonthYear(ym.y, ym.m)}`,
        rows: (data?.rows ?? []).filter((r) => r.status !== 'kelajak').map((r) => ({
          Sana: formatShortDate(r.date),
          Kirish: formatTime(r.arrival),
          Chiqish: r.inside ? 'Binoda' : formatTime(r.departure),
          ...(isT ? { 'Ishlagan vaqti': r.arrival ? formatDuration(liveWorked(r, now)) : '—' } : {}),
          Holat: r.status === 'dam' ? r.holiday ?? 'Dam olish kuni' : STATUS_LABEL[r.status],
          Izoh: r.reason ? `${r.reason.type === 'sababli' ? 'Sababli' : 'Sababsiz'}${r.reason.note ? ': ' + r.reason.note : ''}` : '',
        })),
      },
    ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MonthPicker year={ym.y} month0={ym.m} onChange={(y, m) => setYm({ y, m })} />
        <Button variant="outline" icon={<FileSpreadsheet size={16} />} onClick={exportMonth} disabled={!data}>
          Excelga yuklab olish
        </Button>
      </div>
      {error ? (
        <Card><ErrorState onRetry={reload} /></Card>
      ) : loading || !data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
          <Skeleton className="h-72 w-full !rounded-card" />
        </>
      ) : (
        <>
          <div className={`grid gap-3 sm:grid-cols-3 ${isT ? 'xl:grid-cols-5' : ''}`}>
            <MiniStat icon={<CalendarCheck size={18} />} tone="bg-success-soft text-success-ink" label="Kelgan kunlar" value={data.cameDays} />
            <MiniStat icon={<Clock size={18} />} tone="bg-warning-soft text-warning-ink" label="Kechikishlar" value={data.lateDays} />
            <MiniStat icon={<CalendarX size={18} />} tone="bg-danger-soft text-danger-ink" label="Kelmagan kunlar" value={data.absentDays} />
            {isT && <MiniStat icon={<Timer size={18} />} tone="bg-info-soft text-info-ink" label="Jami ishlagan vaqt" value={formatDuration(data.totalMinutes)} />}
            {isT && <MiniStat icon={<UserCheck size={18} />} tone="bg-primary-soft text-primary-ink" label="O'rtacha kelish vaqti" value={data.avgArrival === null ? '—' : minutesToHM(data.avgArrival)} />}
          </div>

          <Card className="p-5">
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {WEEK_MON_FIRST.map((d) => (
                <div key={d} className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wider text-muted">
                  {WEEKDAYS_SHORT[d]}
                </div>
              ))}
              {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
              {data.rows.map((r) => {
                const col = color[r.status];
                const isToday = r.date === todayISO();
                const cell = (
                  <div
                    tabIndex={r.status === 'kelajak' ? -1 : 0}
                    className={`focus-ring flex aspect-square min-h-[38px] flex-col items-center justify-center rounded-ctl text-sm font-semibold tabular transition-transform sm:aspect-[4/3] ${r.status !== 'kelajak' ? 'cursor-default hover:scale-[1.04]' : ''} ${
                      r.status === 'dam' ? 'bg-neutral-soft text-neutral-ink' : r.status === 'kelajak' ? 'border border-dashed border-border text-muted' : ''
                    } ${isToday ? 'ring-2 ring-text ring-offset-2' : ''}`}
                    style={{ ...(col ? { background: col.bg, color: col.fg } : {}), ['--tw-ring-offset-color' as string]: 'var(--surface)' }}
                  >
                    {parseISODate(r.date).getDate()}
                    {r.inside && <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-current" />}
                  </div>
                );
                return r.status === 'kelajak' ? <div key={r.date}>{cell}</div> : <Tooltip key={r.date} content={dayTooltip(r, now)}>{cell}</Tooltip>;
              })}
            </div>
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              {[['Keldi', c.keldi], ['Kechikdi', c.kechikdi], ['Kelmadi', c.kelmadi], ['Dam olish kuni', c.neutral]].map(([l, col]) => (
                <li key={l} className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded" style={{ background: col }} />{l}</li>
              ))}
              <li className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-dashed border-border-strong" />Kelajak</li>
            </ul>
          </Card>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-separate border-spacing-0">
                <thead>
                  <tr className="[&>th]:border-b [&>th]:border-border [&>th]:bg-surface-2">
                    <th className="th">Sana</th>
                    <th className="th">Kirish</th>
                    <th className="th">Chiqish</th>
                    {isT && <th className="th">Ishlagan vaqti</th>}
                    <th className="th">Holat</th>
                    <th className="th">Izoh</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.filter((r) => r.status !== 'kelajak').reverse().map((r) => (
                    <tr key={r.date} className="hover:bg-surface-2 [&>td]:border-b [&>td]:border-border">
                      <td className="td whitespace-nowrap">{formatFullDate(r.date)}</td>
                      <td className="td">{r.arrival ? <Pill tone="primary">{formatTime(r.arrival)}</Pill> : <span className="text-muted">—</span>}</td>
                      <td className="td">{r.inside ? <StatusBadge status="binoda" /> : r.departure ? <Pill tone="neutral">{formatTime(r.departure)}</Pill> : <span className="text-muted">—</span>}</td>
                      {isT && <td className="td whitespace-nowrap tabular text-muted">{r.arrival ? formatDuration(liveWorked(r, now)) : '—'}</td>}
                      <td className="td">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={r.status} />
                          {r.status === 'kechikdi' && <span className="text-xs text-warning-ink tabular">+{r.lateMinutes} daq</span>}
                        </div>
                      </td>
                      <td className="td text-muted">
                        {r.status === 'dam' && r.holiday ? r.holiday : r.reason ? (
                          <span className="inline-flex items-center gap-1.5"><ReasonBadge reason={r.reason} />{r.reason.note}</span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function PassesTab({ type, id }: { type: PersonType; id: string }) {
  const { tick } = useLive();
  const { data, loading, error, reload } = useAsync(() => api.getPersonPasses(type, id), [id], { silentDeps: [tick] });
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  return (
    <Card className="overflow-hidden">
      {loading ? (
        <TableSkeleton rows={6} cols={3} />
      ) : error ? (
        <ErrorState onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState text="O'tishlar qayd etilmagan" />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-separate border-spacing-0">
              <thead>
                <tr className="[&>th]:border-b [&>th]:border-border [&>th]:bg-surface-2">
                  <th className="th">Vaqt</th>
                  <th className="th">Yo'nalish</th>
                  <th className="th">Turniket</th>
                </tr>
              </thead>
              <tbody>
                {data.slice((page - 1) * size, page * size).map((e) => (
                  <tr key={e.id} className="hover:bg-surface-2 [&>td]:border-b [&>td]:border-border">
                    <td className="td whitespace-nowrap tabular">{formatDateTime(e.time)}</td>
                    <td className="td">
                      {e.direction === 'in' ? <Pill tone="success" icon={<ArrowDownLeft size={12} />}>Kirish</Pill> : <Pill tone="neutral" icon={<ArrowUpRight size={12} />}>Chiqish</Pill>}
                    </td>
                    <td className="td text-muted">{e.turnstileName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={size} total={data.length} onPage={setPage} onPageSize={(n) => { setSize(n); setPage(1); }} />
        </>
      )}
    </Card>
  );
}

export default function ProfilePage({ type }: { type: PersonType }) {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const { can } = useAuth();
  const st = useStructure();
  const isT = type === 'teacher';
  const [tab, setTab] = useState<Tab>('malumot');
  const { tick } = useLive();
  const { data: person, loading, error, reload } = useAsync<Teacher | Student | null>(() => (isT ? api.getTeacher(id) : api.getStudent(id)), [id, type]);
  const { data: today } = useAsync(() => api.getPersonDay(type, id, todayISO()), [id, type], { silentDeps: [tick] });
  useDocumentTitle(person ? fullName(person) : isT ? "O'qituvchi profili" : 'Talaba profili');
  const back = isT ? '/oqituvchilar' : '/talabalar';

  if (loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-44 w-full !rounded-card" />
        <Skeleton className="h-80 w-full !rounded-card" />
      </div>
    );
  if (error) return <Card><ErrorState onRetry={reload} /></Card>;
  if (!person) return <Card><EmptyState text={isT ? "O'qituvchi topilmadi" : 'Talaba topilmadi'} action={<Button onClick={() => nav(back)}>Ro'yxatga qaytish</Button>} /></Card>;

  const t = person as Teacher;
  const s = person as Student;
  const dep = st?.departments.find((d) => d.id === person.departmentId)?.name ?? '—';
  const fac = st?.faculties.find((f) => f.id === (isT ? st?.departments.find((d) => d.id === t.departmentId)?.facultyId : s.facultyId))?.name ?? '—';
  const group = !isT ? st?.groups.find((g) => g.id === s.groupId)?.name ?? '—' : '';
  const dir = !isT ? st?.directions.find((d) => d.id === s.directionId)?.name ?? '—' : '';
  const name = fullName(person);

  const common: [string, ReactNode][] = [
    ['Familiya', person.lastName],
    ['Ism', person.firstName],
    ['Otasining ismi', person.middleName],
    ["Tug'ilgan sana", formatShortDate(person.birthDate)],
    ['Jinsi', person.gender === 'erkak' ? 'Erkak' : 'Ayol'],
    ['Telefon raqami', <span className="tabular">{person.phone}</span>],
  ];
  const info: { title: string; items: [string, ReactNode][] }[] = isT
    ? [
        { title: "Shaxsiy ma'lumotlar", items: [...common, ["Qo'shimcha telefon raqami", t.phone2 ? <span className="tabular">{t.phone2}</span> : '—']] },
        {
          title: "Pasport ma'lumotlari",
          items: [
            ['Pasport seriyasi va raqami', <Secret value={t.passport} mask={maskPassport} />],
            ['JSHSHIR', <Secret value={t.jshshir} mask={maskJshshir} />],
            ['Berilgan sana', formatShortDate(t.passportIssued)],
            ['Kim tomonidan berilgan', t.passportIssuedBy],
            ['Amal qilish muddati', formatShortDate(t.passportExpiry)],
          ],
        },
        { title: 'Yashash manzili', items: [['Viloyat', t.region], ['Tuman / shahar', t.district], ['Manzil', t.address]] },
        {
          title: "Ish ma'lumotlari",
          items: [['Fakultet', fac], ['Kafedra', dep], ['Lavozimi', t.position], ['Ilmiy daraja', t.degree], ['Ishga qabul qilingan sana', formatShortDate(t.hiredDate)], ['Stavka', t.rate], ['Holati', t.active ? <Pill tone="success">Faol</Pill> : <Pill tone="neutral">Nofaol</Pill>]],
        },
      ]
    : [
        { title: "Shaxsiy ma'lumotlar", items: [...common, ['JSHSHIR', <Secret value={s.jshshir} mask={maskJshshir} />], ['Viloyat', s.region], ['Tuman / shahar', s.district], ['Manzil', s.address]] },
        ...s.parents.map((p, i) => ({
          title: s.parents.length > 1 ? `Ota-ona ma'lumotlari (${i + 1})` : "Ota-ona ma'lumotlari",
          items: [['Ota-onasining F.I.Sh', p.fullName], ['Kimligi', p.relation], ['Telefon raqami', <span className="tabular">{p.phone}</span>], ['Ikkinchi telefon raqami', p.phone2 ? <span className="tabular">{p.phone2}</span> : '—']] as [string, ReactNode][],
        })),
        {
          title: "O'qish ma'lumotlari",
          items: [['Talaba ID', <span className="tabular">{s.studentId}</span>], ['Fakultet', fac], ['Kafedra', dep], ["Yo'nalish", dir], ['Kurs', COURSE_LABELS[s.course]], ['Guruh', group], ["Ta'lim shakli", STUDY_FORM_LABELS[s.studyForm]], ['Qabul qilingan yil', s.admissionYear]],
        },
      ];

  return (
    <div>
      <Link to={back} className="focus-ring mb-3 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted hover:text-primary-ink">
        <ArrowLeft size={16} /> {isT ? "O'qituvchilar ro'yxatiga qaytish" : "Talabalar ro'yxatiga qaytish"}
      </Link>
      <Card className="mb-5 overflow-hidden">
        <div className="h-20" style={{ background: 'linear-gradient(135deg, #00873A 0%, #0FA968 100%)' }} />
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:px-6">
          <div className="-mt-12 rounded-full bg-surface p-1.5">
            <Avatar name={name} photo={person.photo} size={96} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-text sm:text-2xl">{name}</h1>
            <p className="mt-0.5 text-sm text-muted">{isT ? `${t.position} · ${dep}` : `${group} · ${dir}`}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {person.turnstileId ? <Pill tone="primary">Turniket ID: {person.turnstileId}</Pill> : <Pill tone="warning">Turniket ID biriktirilmagan</Pill>}
              {!isT && <Pill tone="info">Talaba ID: {s.studentId}</Pill>}
              {today && (
                <>
                  <span className="mx-1 text-xs text-muted">Bugun:</span>
                  <StatusBadge status={today.status} />
                  {today.inside && <StatusBadge status="binoda" />}
                  {today.arrival && <span className="text-xs text-muted tabular">Kirish {formatTime(today.arrival)}</span>}
                </>
              )}
            </div>
          </div>
          {can('manage') && (
            <Button variant="outline" icon={<Pencil size={16} />} onClick={() => nav(`${back}/${id}/tahrirlash`)}>
              Tahrirlash
            </Button>
          )}
        </div>
      </Card>

      <UnderlineTabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'malumot', label: "Ma'lumotlar", icon: <Info size={16} /> },
          { value: 'davomat', label: 'Davomat', icon: <CalendarCheck size={16} /> },
          { value: 'otishlar', label: "O'tishlar tarixi", icon: <History size={16} /> },
        ]}
      />
      <div className="mt-5">
        {tab === 'malumot' && (
          <div className="grid gap-5 xl:grid-cols-2">
            {info.map((sec) => (
              <Card key={sec.title} className="p-5">
                <h2 className="mb-1 text-base font-semibold text-text">{sec.title}</h2>
                <InfoGrid items={sec.items} />
              </Card>
            ))}
          </div>
        )}
        {tab === 'davomat' && <AttendanceTab type={type} id={id} name={name} />}
        {tab === 'otishlar' && <PassesTab type={type} id={id} />}
      </div>
    </div>
  );
}
