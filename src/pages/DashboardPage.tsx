import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Building2, CheckCircle2, Clock, Download, GraduationCap, Radio, UserX, Users } from 'lucide-react';
import * as api from '@/services/api';
import type { LivePass, PersonType, StudentAttendanceRow, TeacherAttendanceRow } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useLive } from '@/context/LiveContext';
import { useChartColors } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { WEEKDAYS, WEEKDAYS_SHORT, formatDayMonth, formatFullDate, formatTime, parseISODate, todayISO, greeting } from '@/utils/date';
import { formatNumber, fullName } from '@/utils/format';
import { exportExcel } from '@/utils/excel';
import { useAsync, useDocumentTitle, useStructure } from '@/utils/hooks';
import { Avatar, Pill, STATUS_LABEL, TypeBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, EmptyState, ErrorState, SectionTitle, Skeleton, Tabs } from '@/components/ui/Misc';
import { StatCard } from '@/components/StatCard';
import { ChartTooltip } from '@/components/ChartTooltip';
import { ParentPhoneButton } from '@/components/AttendanceBits';
import { LiveDot } from '@/components/layout/Header';

const TYPE_TABS: { value: PersonType; label: string }[] = [
  { value: 'teacher', label: "O'qituvchilar" },
  { value: 'student', label: 'Talabalar' },
];

function StatsBlock({ type, data, loading }: { type: PersonType; data: Awaited<ReturnType<typeof api.getDashboardStats>>['teachers'] | undefined; loading: boolean }) {
  const nav = useNavigate();
  const c = useChartColors();
  const base = type === 'teacher' ? '/oqituvchilar-davomati' : '/talabalar-davomati';
  const go = (holat = '') => nav(holat ? `${base}?holat=${holat}` : base);
  const isT = type === 'teacher';
  const working = data ? data.total - data.dam : 0;
  const pct = data && working ? Math.round(((data.keldi + data.kechikdi) / working) * 100) : 0;
  return (
    <section className="mb-6">
      <SectionTitle
        icon={isT ? <Users size={17} /> : <GraduationCap size={17} />}
        title={isT ? "O'qituvchilar statistikasi" : 'Talabalar statistikasi'}
        tag={isT ? <Pill tone="primary">O'qituvchilar</Pill> : <Pill tone="info">Talabalar</Pill>}
        right={
          <Link to={base} className="focus-ring inline-flex items-center gap-1 rounded-md text-sm font-semibold text-primary-ink hover:underline">
            Batafsil <ArrowRight size={15} />
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <div className="col-span-2 md:col-span-1">
          <StatCard loading={loading} tone="gradient" label={isT ? "Jami o'qituvchilar" : 'Jami talabalar'} value={data?.total ?? 0} icon={isT ? <Users size={19} /> : <GraduationCap size={19} />} sub={data?.dam ? 'Bugun dam olish kuni' : `Davomat: ${pct}%`} onClick={() => go()} />
        </div>
        <StatCard loading={loading} tone="success" label="Kelganlar" value={data?.keldi ?? 0} icon={<CheckCircle2 size={19} />} sub={`Davomat: ${pct}%`} trend={data?.trend.keldi} spark={data?.spark.keldi} sparkColor={c.keldi} onClick={() => go('keldi')} />
        <StatCard loading={loading} tone="warning" label="Kechikkanlar" value={data?.kechikdi ?? 0} icon={<Clock size={19} />} trend={data?.trend.kechikdi} goodWhenUp={false} spark={data?.spark.kechikdi} sparkColor={c.kechikdi} onClick={() => go('kechikdi')} />
        <StatCard loading={loading} tone="danger" label="Kelmaganlar" value={data?.kelmadi ?? 0} icon={<UserX size={19} />} trend={data?.trend.kelmadi} goodWhenUp={false} spark={data?.spark.kelmadi} sparkColor={c.kelmadi} onClick={() => go('kelmadi')} />
        <StatCard loading={loading} tone="info" label="Hozir binoda" value={data?.binoda ?? 0} icon={<Building2 size={19} />} trend={data?.trend.binoda} spark={data?.spark.binoda} sparkColor={c.binoda} onClick={() => go('binoda')} />
      </div>
    </section>
  );
}

function WeeklyChart({ tick }: { tick: number }) {
  const [type, setType] = useState<PersonType>('teacher');
  const c = useChartColors();
  const { data, loading } = useAsync(() => api.getWeekly(type), [type], { silentDeps: [tick] });
  const rows = data ?? [];
  return (
    <Card className="p-5 xl:col-span-2">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-text">Haftalik davomat</h3>
        <Tabs size="sm" value={type} onChange={setType} items={TYPE_TABS} />
      </div>
      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="h-64" role="img" aria-label="Haftalik davomat grafigi">
          <ResponsiveContainer>
            <AreaChart data={rows} margin={{ left: -18, right: 8, top: 8 }}>
              <defs>
                {(['keldi', 'kechikdi', 'kelmadi'] as const).map((k) => (
                  <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c[k]} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={c[k]} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke={c.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d: string) => WEEKDAYS_SHORT[parseISODate(d).getDay()]} tick={{ fill: c.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: c.axis, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <RTooltip
                cursor={{ stroke: c.grid }}
                content={<ChartTooltip labelFormatter={(d) => `${WEEKDAYS[parseISODate(d).getDay()]}, ${formatDayMonth(d)}:`} />}
              />
              <Area type="monotone" dataKey="keldi" name="Keldi" stroke={c.keldi} strokeWidth={2.2} fill="url(#g-keldi)" />
              <Area type="monotone" dataKey="kechikdi" name="Kechikdi" stroke={c.kechikdi} strokeWidth={2.2} fill="url(#g-kechikdi)" />
              <Area type="monotone" dataKey="kelmadi" name="Kelmadi" stroke={c.kelmadi} strokeWidth={2.2} fill="url(#g-kelmadi)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <Legend items={[['Keldi', c.keldi], ['Kechikdi', c.kechikdi], ['Kelmadi', c.kelmadi]]} />
    </Card>
  );
}

function Legend({ items }: { items: [string, string, string?][] }) {
  return (
    <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted">
      {items.map(([l, col, v]) => (
        <li key={l} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: col }} />
          {l}
          {v !== undefined && <span className="font-semibold text-text tabular">{v}</span>}
        </li>
      ))}
    </ul>
  );
}

function TodayDonut({ tick }: { tick: number }) {
  const [type, setType] = useState<PersonType>('teacher');
  const c = useChartColors();
  const { data, loading } = useAsync(() => api.getTodaySummary(type), [type], { silentDeps: [tick] });
  const working = data ? data.total - data.dam : 0;
  const pct = data && working ? Math.round(((data.keldi + data.kechikdi) / working) * 100) : 0;
  const parts = data
    ? [
        { name: 'Keldi', value: data.keldi, fill: c.keldi },
        { name: 'Kechikdi', value: data.kechikdi, fill: c.kechikdi },
        { name: 'Kelmadi', value: data.kelmadi, fill: c.kelmadi },
      ]
    : [];
  return (
    <Card className="p-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-text">Bugungi holat</h3>
        <Tabs size="sm" value={type} onChange={setType} items={TYPE_TABS} />
      </div>
      {loading || !data ? (
        <Skeleton className="mx-auto mt-4 h-48 w-48 !rounded-full" />
      ) : working === 0 ? (
        <EmptyState text="Bugun dam olish kuni" />
      ) : (
        <div className="relative h-56" role="img" aria-label={`Bugungi davomat: ${pct}%`}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={parts} dataKey="value" nameKey="name" innerRadius="66%" outerRadius="90%" paddingAngle={2} stroke={c.surface} strokeWidth={2}>
                {parts.map((p) => (
                  <Cell key={p.name} fill={p.fill} />
                ))}
              </Pie>
              <RTooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-text tabular">{pct}%</span>
            <span className="text-xs text-muted">davomat</span>
          </div>
        </div>
      )}
      <Legend
        items={[
          ['Keldi', c.keldi, data ? String(data.keldi) : undefined],
          ['Kechikdi', c.kechikdi, data ? String(data.kechikdi) : undefined],
          ['Kelmadi', c.kelmadi, data ? String(data.kelmadi) : undefined],
          ['Binoda', c.binoda, data ? String(data.binoda) : undefined],
        ]}
      />
    </Card>
  );
}

function DepartmentChart({ tick }: { tick: number }) {
  const c = useChartColors();
  const { data, loading } = useAsync(() => api.getDepartmentAttendance(), [], { silentDeps: [tick] });
  return (
    <Card className="p-5 xl:col-span-3">
      <h3 className="mb-4 font-semibold text-text">Kafedralar bo'yicha davomat</h3>
      {loading ? (
        <Skeleton className="h-72 w-full" />
      ) : (
        <div className="h-72" role="img" aria-label="Kafedralar bo'yicha davomat grafigi">
          <ResponsiveContainer>
            <BarChart data={data ?? []} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid stroke={c.grid} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: c.axis, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" width={200} tick={{ fill: c.text, fontSize: 12 }} axisLine={false} tickLine={false} />
              <RTooltip cursor={{ fill: c.grid, opacity: 0.4 }} content={<ChartTooltip valueSuffix="%" />} />
              <Bar dataKey="percent" name="Davomat" fill={c.keldi} radius={[0, 6, 6, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

function PeopleList({ kind, tick }: { kind: 'late' | 'absent'; tick: number }) {
  const [type, setType] = useState<PersonType>('teacher');
  const st = useStructure();
  const { data, loading, error, reload } = useAsync<(TeacherAttendanceRow | StudentAttendanceRow)[]>(
    () => (kind === 'late' ? (type === 'teacher' ? api.getTodayLate('teacher') : api.getTodayLate('student')) : type === 'teacher' ? api.getTodayAbsent('teacher') : api.getTodayAbsent('student')),
    [type, kind],
    { silentDeps: [tick] },
  );
  const sub = (r: TeacherAttendanceRow | StudentAttendanceRow) =>
    r.personType === 'teacher'
      ? st?.departments.find((d) => d.id === (r as TeacherAttendanceRow).person.departmentId)?.name
      : st?.groups.find((g) => g.id === (r as StudentAttendanceRow).person.groupId)?.name;
  const base = type === 'teacher' ? '/oqituvchilar-davomati' : '/talabalar-davomati';
  const nav = useNavigate();
  return (
    <Card className="flex flex-col p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-text">{kind === 'late' ? 'Bugun kechikkanlar' : 'Bugun kelmaganlar'}</h3>
        <Tabs size="sm" value={type} onChange={setType} items={TYPE_TABS} />
      </div>
      <div className="flex-1">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 !rounded-full" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState onRetry={reload} />
        ) : !data?.length ? (
          <EmptyState text={kind === 'late' ? 'Bugun kechikkanlar yo\'q' : "Bugun kelmaganlar yo'q"} icon={<CheckCircle2 size={20} />} />
        ) : (
          <ul className="divide-y divide-border">
            {data.map((r) => (
              <li key={r.key}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => nav(`${type === 'teacher' ? '/oqituvchilar' : '/talabalar'}/${r.personId}`)}
                  onKeyDown={(e) => e.key === 'Enter' && nav(`${type === 'teacher' ? '/oqituvchilar' : '/talabalar'}/${r.personId}`)}
                  className="focus-ring -mx-2 flex cursor-pointer items-center gap-3 rounded-ctl px-2 py-2.5 hover:bg-surface-2"
                >
                  <Avatar name={fullName(r.person)} photo={r.person.photo} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-text">{fullName(r.person)}</div>
                    <div className="truncate text-xs text-muted">{sub(r)}</div>
                  </div>
                  {kind === 'late' ? (
                    <div className="text-right">
                      <Pill tone="primary">{formatTime(r.arrival)}</Pill>
                      <div className="mt-1 text-xs font-semibold text-warning-ink tabular">+{r.lateMinutes} daq kechikdi</div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="hidden text-xs text-muted tabular sm:inline">{r.person.phone}</span>
                      {r.personType === 'student' && (
                        <span onClick={(e) => e.stopPropagation()}>
                          <ParentPhoneButton parents={(r as StudentAttendanceRow).person.parents} compact />
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Link to={`${base}?holat=${kind === 'late' ? 'kechikdi' : 'kelmadi'}`} className="focus-ring mt-3 inline-flex items-center gap-1 self-start rounded-md text-sm font-semibold text-primary-ink hover:underline">
        Barchasini ko'rish <ArrowRight size={15} />
      </Link>
    </Card>
  );
}

function LiveFeed() {
  const { tick, last } = useLive();
  const { data, loading, error, reload, setData } = useAsync(() => api.getLiveFeed(10), []);
  const fresh = useRef<string | null>(null);
  useEffect(() => {
    if (!last || !tick) return;
    fresh.current = last.id;
    setData((d) => [last, ...(d ?? []).filter((x) => x.id !== last.id)].slice(0, 10));
  }, [tick, last, setData]);
  const nav = useNavigate();
  const open = (p: LivePass) => p.personType && p.personId && nav(`${p.personType === 'teacher' ? '/oqituvchilar' : '/talabalar'}/${p.personId}`);
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary-ink">
            <Radio size={16} />
          </span>
          <h3 className="font-semibold text-text">So'nggi o'tishlar</h3>
        </div>
        <LiveDot />
      </div>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorState onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState text="Bugun hali o'tishlar qayd etilmagan" />
      ) : (
        <ul className="divide-y divide-border">
          {data.map((p) => (
            <li key={p.id} className={p.id === fresh.current ? 'anim-highlight rounded-ctl' : ''}>
              <button onClick={() => open(p)} className="focus-ring -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-ctl px-2 py-2.5 text-left hover:bg-surface-2">
                <span className="w-12 shrink-0 text-sm font-semibold text-text tabular">{formatTime(p.time)}</span>
                <Avatar name={p.fullName ?? '?'} photo={p.photo} size={34} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">{p.fullName ?? "Noma'lum"}</span>
                <span className="hidden sm:inline">{p.personType && <TypeBadge type={p.personType} />}</span>
                {p.direction === 'in' ? (
                  <Pill tone="success" icon={<ArrowDownLeft size={12} />}>
                    Kirish
                  </Pill>
                ) : (
                  <Pill tone="neutral" icon={<ArrowUpRight size={12} />}>
                    Chiqish
                  </Pill>
                )}
                <span className="hidden w-20 text-right text-xs text-muted md:inline">{p.turnstileName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function DashboardPage() {
  useDocumentTitle('Bosh sahifa');
  const { user } = useAuth();
  const { tick } = useLive();
  const toast = useToast();
  const st = useStructure();
  const { data, loading, error, reload } = useAsync(() => api.getDashboardStats(), [], { silentDeps: [tick] });
  const [busy, setBusy] = useState(false);
  const firstName = user?.fullName.split(' ')[1] ?? '';

  const download = async () => {
    setBusy(true);
    try {
      const today = todayISO();
      const [t, s] = await Promise.all([api.getTeacherAttendance({ from: today, to: today }), api.getStudentAttendance({ from: today, to: today })]);
      const sumRow = (label: string, x: typeof t.summary) => ({ Toifa: label, Jami: x.total, Keldi: x.keldi, Kechikdi: x.kechikdi, Kelmadi: x.kelmadi, Binoda: x.binoda });
      exportExcel('Bugungi_hisobot', [
        { name: 'Umumiy', title: `Bugungi davomat — ${formatFullDate(today)}`, rows: [sumRow("O'qituvchilar", t.summary), sumRow('Talabalar', s.summary)] },
        {
          name: "O'qituvchilar",
          rows: t.rows.map((r) => ({ 'F.I.Sh': fullName(r.person), Kafedra: st?.departments.find((d) => d.id === r.person.departmentId)?.name ?? '', 'Kelgan vaqti': formatTime(r.arrival), 'Ketgan vaqti': r.inside ? 'Binoda' : formatTime(r.departure), Holat: STATUS_LABEL[r.status] })),
        },
        {
          name: 'Talabalar',
          rows: s.rows.map((r) => ({ 'F.I.Sh': fullName(r.person), Guruh: st?.groups.find((g) => g.id === r.person.groupId)?.name ?? '', 'Kelgan vaqti': formatTime(r.arrival), 'Ketgan vaqti': r.inside ? 'Binoda' : formatTime(r.departure), Holat: STATUS_LABEL[r.status] })),
        },
      ]);
      toast.success('Hisobot yuklab olindi');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">
            {greeting()}, {firstName}!
          </h1>
          <p className="mt-1 text-sm text-muted">Bugungi davomat ko'rsatkichlari — {formatNumber((data?.teachers.total ?? 0) + (data?.students.total ?? 0))} nafar kuzatuvda</p>
        </div>
        <Button icon={<Download size={16} />} loading={busy} onClick={download}>
          Hisobotni yuklab olish
        </Button>
      </div>

      {error ? (
        <Card className="mb-6">
          <ErrorState onRetry={reload} />
        </Card>
      ) : (
        <>
          <StatsBlock type="teacher" data={data?.teachers} loading={loading} />
          <StatsBlock type="student" data={data?.students} loading={loading} />
        </>
      )}

      <div className="mb-6 grid gap-4 xl:grid-cols-3">
        <WeeklyChart tick={tick} />
        <TodayDonut tick={tick} />
        <DepartmentChart tick={tick} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <PeopleList kind="late" tick={tick} />
        <PeopleList kind="absent" tick={tick} />
      </div>

      <LiveFeed />
    </div>
  );
}
