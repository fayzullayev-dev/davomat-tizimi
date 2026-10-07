import { Fragment, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import { CalendarRange, ChevronDown, ChevronRight, Clock, FileSpreadsheet as SheetIcon, GraduationCap, Printer, UserX } from 'lucide-react';
import * as api from '@/services/api';
import type { PersonType } from '@/types';
import { useChartColors } from '@/context/ThemeContext';
import { WEEKDAYS_SHORT, addDays, formatDuration, formatMonthYear, formatRange, parseISODate, startOfMonth, todayISO } from '@/utils/date';
import { formatDecimal, fullName } from '@/utils/format';
import { exportExcel } from '@/utils/excel';
import { useAsync, useDocumentTitle, useQueryState, useStructure } from '@/utils/hooks';
import { Avatar, Pill } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Form';
import { DateRangePicker, MonthPicker } from '@/components/ui/DatePicker';
import { Card, EmptyState, ErrorState, PageHeader, TableSkeleton, Tabs, UnderlineTabs } from '@/components/ui/Misc';
import { Tooltip } from '@/components/ui/Tooltip';
import { ChartTooltip } from '@/components/ChartTooltip';

type Tab = 'tabel' | 'guruhlar' | 'kechikishlar' | 'kelmaganlar';

function Toolbar({ children, onExport, onPrint }: { children: React.ReactNode; onExport: () => void; onPrint: () => void }) {
  return (
    <div className="no-print card mb-4 flex flex-wrap items-center gap-3 p-4">
      {children}
      <div className="ml-auto flex flex-wrap gap-2">
        <Button variant="outline" icon={<SheetIcon size={16} />} onClick={onExport}>Excelga yuklab olish</Button>
        <Button variant="outline" icon={<Printer size={16} />} onClick={() => { onPrint(); setTimeout(() => window.print(), 150); }}>Chop etish</Button>
      </div>
    </div>
  );
}

function PrintHeader({ title }: { title: string }) {
  return <h1 className="print-only mb-3 text-lg font-bold">{title}</h1>;
}

// ---------- 1. O'qituvchilar tabeli ----------
function TimesheetTab() {
  const now = new Date();
  const [q, setQ] = useQueryState({ yil: String(now.getFullYear()), oy: String(now.getMonth()), kafedra: '' });
  const y = Number(q.yil);
  const m = Number(q.oy);
  const st = useStructure();
  const { data, loading, error, reload } = useAsync(() => api.getTimesheet(y, m, q.kafedra), [y, m, q.kafedra]);
  const title = `O'qituvchilar ish vaqti tabeli — ${formatMonthYear(y, m)}`;
  const doExport = () =>
    exportExcel('Oqituvchilar_tabeli', [
      {
        name: 'Tabel',
        title,
        rows: (data?.rows ?? []).map((r) => {
          const row: Record<string, string | number> = { 'F.I.Sh': fullName(r.teacher), Lavozimi: r.teacher.position };
          r.cells.forEach((c, i) => (row[String(i + 1)] = c.kind === 'absent' ? 'Y' : c.kind === 'off' ? 'D' : c.kind === 'future' ? '' : formatDecimal(c.hours)));
          return { ...row, 'Ish kunlari': r.workDays, 'Kelgan kunlar': r.cameDays, Kechikishlar: r.lateCount, Kelmagan: r.absentCount, 'Jami soat': formatDecimal(r.totalHours) };
        }),
      },
    ]);
  return (
    <div>
      <Toolbar onExport={doExport} onPrint={() => undefined}>
        <MonthPicker year={y} month0={m} onChange={(yy, mm) => setQ({ yil: String(yy), oy: String(mm) })} />
        <Select aria-label="Kafedra" className="w-64" value={q.kafedra} onChange={(e) => setQ({ kafedra: e.target.value })} placeholder="Barcha kafedralar" options={(st?.departments ?? []).map((d) => ({ value: d.id, label: d.name }))} />
      </Toolbar>
      <PrintHeader title={title} />
      <Card className="overflow-hidden">
        {loading ? <TableSkeleton rows={8} cols={10} /> : error ? <ErrorState onRetry={reload} /> : !data?.rows.length ? <EmptyState text="Tanlangan filtrlar bo'yicha ma'lumot topilmadi" /> : (
          <div className="print-overflow-visible max-h-[calc(100vh-280px)] overflow-auto">
            <table className="w-max min-w-full border-separate border-spacing-0 text-xs">
              <thead className="sticky top-0 z-[2]">
                <tr className="[&>th]:border-b [&>th]:border-border [&>th]:bg-surface-2">
                  <th className="th sticky-col z-[3] min-w-[220px] !text-[10px]">F.I.Sh</th>
                  {data.days.map((d) => {
                    const dt = parseISODate(d.date);
                    return (
                      <th key={d.date} className={`!px-0 py-2 text-center text-[10px] font-semibold ${d.off ? 'text-danger-ink' : 'text-muted'}`} style={{ minWidth: 34 }}>
                        <div className="tabular">{dt.getDate()}</div>
                        <div className="font-medium opacity-80">{WEEKDAYS_SHORT[dt.getDay()]}</div>
                      </th>
                    );
                  })}
                  {['Ish kunlari', 'Kelgan kunlar', 'Kechikishlar', 'Kelmagan', 'Jami soat'].map((h) => (
                    <th key={h} className="th !px-2 text-center !text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.teacher.id} className="group [&>td]:border-b [&>td]:border-border">
                    <td className="sticky-col bg-surface px-4 py-2 group-hover:bg-surface-2">
                      <div className="font-semibold text-text">{fullName(r.teacher)}</div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">{r.teacher.position}</div>
                    </td>
                    {r.cells.map((c) => (
                      <td key={c.date} className={`border-l border-border text-center tabular ${c.kind === 'off' ? 'bg-neutral-soft text-neutral-ink' : c.kind === 'absent' ? 'bg-danger-soft font-bold text-danger-ink' : 'bg-surface text-text group-hover:bg-surface-2'}`}>
                        {c.kind === 'off' ? 'D' : c.kind === 'absent' ? 'Y' : c.kind === 'future' ? '' : (
                          <span className="relative inline-flex items-center">
                            {formatDecimal(c.hours)}
                            {c.kind === 'late' && <span className="absolute -right-1.5 -top-1 h-1.5 w-1.5 rounded-full bg-warning" aria-label="Kechikkan" />}
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="border-l border-border bg-surface px-2 text-center font-semibold tabular text-text">{r.workDays}</td>
                    <td className="bg-surface px-2 text-center font-semibold tabular text-success-ink">{r.cameDays}</td>
                    <td className="bg-surface px-2 text-center font-semibold tabular text-warning-ink">{r.lateCount}</td>
                    <td className="bg-surface px-2 text-center font-semibold tabular text-danger-ink">{r.absentCount}</td>
                    <td className="bg-surface px-2 text-center font-bold tabular text-text">{formatDecimal(r.totalHours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
        <li className="inline-flex items-center gap-1.5"><span className="font-semibold text-text tabular">8,5</span> — ishlagan soatlar</li>
        <li className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" /> — kechikkan</li>
        <li className="inline-flex items-center gap-1.5"><span className="rounded bg-danger-soft px-1.5 font-bold text-danger-ink">Y</span> — kelmagan (yo'q)</li>
        <li className="inline-flex items-center gap-1.5"><span className="rounded bg-neutral-soft px-1.5 font-bold text-neutral-ink">D</span> — dam olish yoki bayram kuni</li>
      </ul>
      <div className="print-only mt-10">
        <div className="flex justify-between text-sm">
          <span>Kadrlar bo'limi boshlig'i: ________________</span>
          <span>Direktor: ________________</span>
        </div>
      </div>
    </div>
  );
}

// ---------- 2. Talabalar davomati hisoboti ----------
function GroupsTab() {
  const today = todayISO();
  const [q, setQ] = useQueryState({ from: startOfMonth(today), to: today, fakultet: '', kafedra: '', guruh: '' });
  const st = useStructure();
  const c = useChartColors();
  const nav = useNavigate();
  const [open, setOpen] = useState<Set<string>>(new Set());
  const { data, loading, error, reload } = useAsync(() => api.getGroupReport({ from: q.from, to: q.to, facultyId: q.fakultet, departmentId: q.kafedra, groupId: q.guruh }), [q.from, q.to, q.fakultet, q.kafedra, q.guruh]);
  const deps = (st?.departments ?? []).filter((d) => !q.fakultet || d.facultyId === q.fakultet);
  const dirIds = (st?.directions ?? []).filter((d) => deps.some((x) => x.id === d.departmentId) && (!q.kafedra || d.departmentId === q.kafedra)).map((d) => d.id);
  const groups = (st?.groups ?? []).filter((g) => dirIds.includes(g.directionId));
  const title = `Talabalar davomati hisoboti — ${formatRange(q.from, q.to)}`;
  const tone = (p: number) => (p >= 90 ? 'success' : p >= 75 ? 'warning' : 'danger');
  const doExport = () =>
    exportExcel('Talabalar_davomati_hisoboti', [
      { name: 'Guruhlar', title, rows: (data ?? []).map((g) => ({ Guruh: g.group.name, "Yo'nalish": g.directionName, 'Talabalar soni': g.count, "O'rtacha davomat %": g.percent, Kechikishlar: g.late, Kelmaganlar: g.absent })) },
      { name: 'Talabalar', rows: (data ?? []).flatMap((g) => g.students.map((s) => ({ Guruh: g.group.name, 'F.I.Sh': fullName(s.student), 'Talaba ID': s.student.studentId, 'Davomat %': s.percent, Kechikishlar: s.late, Kelmaganlar: s.absent }))) },
    ]);
  return (
    <div>
      <Toolbar onExport={doExport} onPrint={() => setOpen(new Set((data ?? []).map((g) => g.group.id)))}>
        <div className="w-64"><DateRangePicker from={q.from} to={q.to} onChange={(from, to) => setQ({ from, to })} /></div>
        <Select aria-label="Fakultet" className="w-56" value={q.fakultet} onChange={(e) => setQ({ fakultet: e.target.value, kafedra: '', guruh: '' })} placeholder="Barcha fakultetlar" options={(st?.faculties ?? []).map((d) => ({ value: d.id, label: d.name }))} />
        <Select aria-label="Kafedra" className="w-56" value={q.kafedra} onChange={(e) => setQ({ kafedra: e.target.value, guruh: '' })} placeholder="Barcha kafedralar" options={deps.map((d) => ({ value: d.id, label: d.name }))} />
        <Select aria-label="Guruh" className="w-44" value={q.guruh} onChange={(e) => setQ({ guruh: e.target.value })} placeholder="Barcha guruhlar" options={groups.map((g) => ({ value: g.id, label: g.name }))} />
      </Toolbar>
      <PrintHeader title={title} />
      {loading ? <Card><TableSkeleton rows={8} cols={6} /></Card> : error ? <Card><ErrorState onRetry={reload} /></Card> : !data?.length ? <Card><EmptyState text="Tanlangan filtrlar bo'yicha ma'lumot topilmadi" /></Card> : (
        <div className="space-y-4">
          <Card className="no-print p-5">
            <h3 className="mb-4 font-semibold text-text">Guruhlar bo'yicha davomat (%)</h3>
            <div className="h-64" role="img" aria-label="Guruhlar bo'yicha davomat grafigi">
              <ResponsiveContainer>
                <BarChart data={data.map((g) => ({ name: g.group.name, percent: g.percent }))} margin={{ left: -16, right: 8 }}>
                  <CartesianGrid stroke={c.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: c.axis, fontSize: 11 }} axisLine={false} tickLine={false} interval={0} angle={-40} textAnchor="end" height={60} />
                  <YAxis domain={[0, 100]} tick={{ fill: c.axis, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <RTooltip cursor={{ fill: c.grid, opacity: 0.4 }} content={<ChartTooltip valueSuffix="%" />} />
                  <Bar dataKey="percent" name="Davomat" radius={[6, 6, 0, 0]} maxBarSize={28}>
                    {data.map((g) => <Cell key={g.group.id} fill={g.percent >= 90 ? c.keldi : g.percent >= 75 ? c.kechikdi : c.kelmadi} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="overflow-hidden">
            <div className="print-overflow-visible overflow-x-auto">
              <table className="w-full min-w-[760px] border-separate border-spacing-0">
                <thead>
                  <tr className="[&>th]:border-b [&>th]:border-border [&>th]:bg-surface-2">
                    <th className="th w-10" /><th className="th">Guruh</th><th className="th">Yo'nalish</th><th className="th">Talabalar soni</th><th className="th">O'rtacha davomat %</th><th className="th">Kechikishlar</th><th className="th">Kelmaganlar</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((g) => {
                    const isOpen = open.has(g.group.id);
                    return (
                      <Fragment key={g.group.id}>
                        <tr
                          className="cursor-pointer hover:bg-surface-2 [&>td]:border-b [&>td]:border-border"
                          onClick={() => setOpen((o) => { const n = new Set(o); if (n.has(g.group.id)) n.delete(g.group.id); else n.add(g.group.id); return n; })}
                          aria-expanded={isOpen}
                        >
                          <td className="td text-muted">{isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
                          <td className="td"><Pill tone="neutral">{g.group.name}</Pill></td>
                          <td className="td text-muted">{g.directionName}</td>
                          <td className="td tabular">{g.count}</td>
                          <td className="td">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-3"><div className={`h-full rounded-full bg-${tone(g.percent)}`} style={{ width: `${g.percent}%` }} /></div>
                              <Pill tone={tone(g.percent)}>{g.percent}%</Pill>
                            </div>
                          </td>
                          <td className="td tabular text-warning-ink">{g.late}</td>
                          <td className="td tabular text-danger-ink">{g.absent}</td>
                        </tr>
                        {isOpen && (
                          <tr>
                            <td colSpan={7} className="border-b border-border bg-surface-2 px-4 py-3">
                              <ul className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
                                {g.students.map((s) => (
                                  <li key={s.student.id}>
                                    <button onClick={() => nav(`/talabalar/${s.student.id}`)} className="focus-ring flex w-full items-center gap-2.5 rounded-ctl px-2 py-1.5 text-left hover:bg-surface">
                                      <Avatar name={fullName(s.student)} size={28} />
                                      <span className="flex-1 truncate text-sm text-text">{fullName(s.student)}</span>
                                      <Pill tone={tone(s.percent)}>{s.percent}%</Pill>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ---------- 3 & 4. Kechikishlar / Kelmaganlar ----------
function RankingTab({ kind }: { kind: 'late' | 'absent' }) {
  const today = todayISO();
  const [q, setQ] = useQueryState({ from: addDays(today, -29), to: today, tur: 'teacher' });
  const type = q.tur as PersonType;
  const nav = useNavigate();
  const late = useAsync(() => (kind === 'late' ? api.getLateReport(type, q.from, q.to) : Promise.resolve([])), [kind, type, q.from, q.to]);
  const abs = useAsync(() => (kind === 'absent' ? api.getAbsentReport(type, q.from, q.to) : Promise.resolve([])), [kind, type, q.from, q.to]);
  const cur = kind === 'late' ? late : abs;
  const who = type === 'teacher' ? "O'qituvchilar" : 'Talabalar';
  const title = `${kind === 'late' ? 'Kechikishlar' : 'Kelmaganlar'} hisoboti (${who.toLowerCase()}) — ${formatRange(q.from, q.to)}`;
  const doExport = () =>
    exportExcel(kind === 'late' ? 'Kechikishlar_hisoboti' : 'Kelmaganlar_hisoboti', [
      {
        name: 'Hisobot',
        title,
        rows:
          kind === 'late'
            ? (late.data ?? []).map((r, i) => ({ '№': i + 1, 'F.I.Sh': r.fullName, [type === 'teacher' ? 'Kafedra' : 'Guruh']: r.sub, 'Kechikishlar soni': r.count, 'Jami kechikish vaqti': formatDuration(r.totalMinutes), "O'rtacha kechikish": formatDuration(r.avgMinutes) }))
            : (abs.data ?? []).map((r, i) => ({ '№': i + 1, 'F.I.Sh': r.fullName, [type === 'teacher' ? 'Kafedra' : 'Guruh']: r.sub, 'Kelmagan kunlar': r.count, Sababli: r.sababli, Sababsiz: r.sababsiz })),
      },
    ]);
  return (
    <div>
      <Toolbar onExport={doExport} onPrint={() => undefined}>
        <div className="w-64"><DateRangePicker from={q.from} to={q.to} onChange={(from, to) => setQ({ from, to })} /></div>
        <Tabs value={type} onChange={(v) => setQ({ tur: v })} items={[{ value: 'teacher', label: "O'qituvchilar" }, { value: 'student', label: 'Talabalar' }]} />
      </Toolbar>
      <PrintHeader title={title} />
      <Card className="overflow-hidden">
        {cur.loading ? <TableSkeleton rows={8} cols={5} /> : cur.error ? <ErrorState onRetry={cur.reload} /> : !(cur.data ?? []).length ? <EmptyState text="Tanlangan davr uchun ma'lumot topilmadi" /> : (
          <div className="print-overflow-visible max-h-[calc(100vh-280px)] overflow-auto">
            <table className="w-full min-w-[720px] border-separate border-spacing-0">
              <thead className="sticky top-0 z-[2]">
                <tr className="[&>th]:border-b [&>th]:border-border [&>th]:bg-surface-2">
                  <th className="th w-14">№</th>
                  <th className="th">F.I.Sh</th>
                  <th className="th">{type === 'teacher' ? 'Kafedra' : 'Guruh'}</th>
                  {kind === 'late' ? (
                    <><th className="th">Kechikishlar soni</th><th className="th">Jami kechikish vaqti</th><th className="th">O'rtacha kechikish</th></>
                  ) : (
                    <><th className="th">Kelmagan kunlar</th><th className="th">Sababli</th><th className="th">Sababsiz</th></>
                  )}
                </tr>
              </thead>
              <tbody>
                {kind === 'late'
                  ? late.data!.map((r, i) => (
                      <tr key={r.id} onClick={() => nav(`/${type === 'teacher' ? 'oqituvchilar' : 'talabalar'}/${r.id}`)} className="cursor-pointer hover:bg-surface-2 [&>td]:border-b [&>td]:border-border">
                        <td className="td tabular text-muted">{i < 3 ? <span className="grid h-7 w-7 place-items-center rounded-full bg-warning-soft font-bold text-warning-ink">{i + 1}</span> : i + 1}</td>
                        <td className="td"><div className="flex items-center gap-3"><Avatar name={r.fullName} size={32} /><span className="font-semibold">{r.fullName}</span></div></td>
                        <td className="td text-muted">{r.sub}</td>
                        <td className="td"><Pill tone="warning">{r.count} marta</Pill></td>
                        <td className="td tabular">{formatDuration(r.totalMinutes)}</td>
                        <td className="td tabular text-muted">{formatDuration(r.avgMinutes)}</td>
                      </tr>
                    ))
                  : abs.data!.map((r, i) => (
                      <tr key={r.id} onClick={() => nav(`/${type === 'teacher' ? 'oqituvchilar' : 'talabalar'}/${r.id}`)} className="cursor-pointer hover:bg-surface-2 [&>td]:border-b [&>td]:border-border">
                        <td className="td tabular text-muted">{i < 3 ? <span className="grid h-7 w-7 place-items-center rounded-full bg-danger-soft font-bold text-danger-ink">{i + 1}</span> : i + 1}</td>
                        <td className="td"><div className="flex items-center gap-3"><Avatar name={r.fullName} size={32} /><span className="font-semibold">{r.fullName}</span></div></td>
                        <td className="td text-muted">{r.sub}</td>
                        <td className="td"><Pill tone="danger">{r.count} kun</Pill></td>
                        <td className="td"><Tooltip content="Sababli kelmagan kunlar"><span tabIndex={0}><Pill tone="info">{r.sababli}</Pill></span></Tooltip></td>
                        <td className="td"><Tooltip content="Sababsiz kelmagan kunlar"><span tabIndex={0}><Pill tone="danger">{r.sababsiz}</Pill></span></Tooltip></td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function ReportsPage() {
  useDocumentTitle('Hisobotlar');
  const [params, setParams] = useSearchParams();
  const q = (params.get('hisobot') as Tab) || 'tabel';
  // Hisobot almashganda boshqa filtrlar tozalanadi
  const change = (t: Tab) => setParams(t === 'tabel' ? {} : { hisobot: t }, { replace: true });
  return (
    <div>
      <PageHeader title="Hisobotlar" />
      <UnderlineTabs
        value={q}
        onChange={change}
        items={[
          { value: 'tabel', label: "O'qituvchilar tabeli", icon: <CalendarRange size={16} /> },
          { value: 'guruhlar', label: 'Talabalar davomati hisoboti', icon: <GraduationCap size={16} /> },
          { value: 'kechikishlar', label: 'Kechikishlar hisoboti', icon: <Clock size={16} /> },
          { value: 'kelmaganlar', label: 'Kelmaganlar hisoboti', icon: <UserX size={16} /> },
        ]}
      />
      <div className="mt-5" key={q}>
        {q === 'tabel' && <TimesheetTab />}
        {q === 'guruhlar' && <GroupsTab />}
        {q === 'kechikishlar' && <RankingTab kind="late" />}
        {q === 'kelmaganlar' && <RankingTab kind="absent" />}
      </div>
    </div>
  );
}
