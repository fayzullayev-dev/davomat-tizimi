import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Eye, MessageSquarePlus, Search } from 'lucide-react';
import * as api from '@/services/api';
import type { StatusFilter, StudentAttendanceRow } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useLive } from '@/context/LiveContext';
import { formatFullDate, formatRange, formatShortDate, formatTime, todayISO } from '@/utils/date';
import { COURSE_LABELS, COURSE_OPTIONS, fullName } from '@/utils/format';
import { exportExcel } from '@/utils/excel';
import { useAsync, useDebounced, useDocumentTitle, useQueryState, useSort, useStructure } from '@/utils/hooks';
import { Avatar, Pill, STATUS_LABEL } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Form';
import { DateRangePicker } from '@/components/ui/DatePicker';
import { EmptyState, ErrorState, PageHeader, Pagination, TableSkeleton } from '@/components/ui/Misc';
import { LiveDot } from '@/components/layout/Header';
import { ArrivalCell, DepartureCell, ParentPhoneButton, ReasonBadge, ReasonModal, RowStatus } from '@/components/AttendanceBits';
import { ProfileDrawer } from '@/components/ProfileDrawer';
import { ClearFiltersButton, ExportPrintButtons, PrintTitle, STATUS_ORDER, SortTh, SummaryChips, compare, usePrint } from '@/components/attendance/Shared';

type SortKey = 'turnstile' | 'name' | 'group' | 'direction' | 'date' | 'arrival' | 'departure' | 'status';

export default function StudentAttendancePage() {
  useDocumentTitle('Talabalar davomati');
  const today = todayISO();
  const [q, setQ, resetQ] = useQueryState({ from: today, to: today, holat: '', fakultet: '', kafedra: '', yonalish: '', kurs: '', guruh: '', qidiruv: '', sahifa: '1', soni: '25' });
  const [search, setSearch] = useState(q.qidiruv);
  const dSearch = useDebounced(search, 300);
  const st = useStructure();
  const { can } = useAuth();
  const { tick } = useLive();
  const live = q.to >= today;

  useEffect(() => {
    if (dSearch !== q.qidiruv) setQ({ qidiruv: dSearch, sahifa: '1' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dSearch]);

  const { data, loading, error, reload, refresh } = useAsync(
    () =>
      api.getStudentAttendance({
        from: q.from, to: q.to, status: q.holat as StatusFilter, facultyId: q.fakultet, departmentId: q.kafedra, directionId: q.yonalish, course: q.kurs, groupId: q.guruh, search: q.qidiruv,
      }),
    [q.from, q.to, q.holat, q.fakultet, q.kafedra, q.yonalish, q.kurs, q.guruh, q.qidiruv],
    { silentDeps: [live ? tick : 0] },
  );

  // Bog'liq selectlar
  const deps = (st?.departments ?? []).filter((d) => !q.fakultet || d.facultyId === q.fakultet);
  const dirs = (st?.directions ?? []).filter((d) => (!q.kafedra || d.departmentId === q.kafedra) && deps.some((x) => x.id === d.departmentId));
  const groups = (st?.groups ?? []).filter((g) => (!q.yonalish || g.directionId === q.yonalish) && dirs.some((d) => d.id === g.directionId) && (!q.kurs || String(g.course) === q.kurs));

  const [sort, toggleSort] = useSort<SortKey>('name');
  const [drawer, setDrawer] = useState<StudentAttendanceRow | null>(null);
  const [reasonRow, setReasonRow] = useState<StudentAttendanceRow | null>(null);
  const [printing, print] = usePrint();
  const groupName = (id: string) => st?.groups.find((g) => g.id === id)?.name ?? '—';
  const dirName = (id: string) => st?.directions.find((d) => d.id === id)?.name ?? '—';

  const sorted = useMemo(() => {
    const rows = [...(data?.rows ?? [])];
    const val = (r: StudentAttendanceRow): string | number | null => {
      switch (sort.key) {
        case 'turnstile': return r.person.turnstileId;
        case 'name': return fullName(r.person);
        case 'group': return groupName(r.person.groupId);
        case 'direction': return dirName(r.person.directionId);
        case 'date': return r.date;
        case 'arrival': return r.arrival ? formatTime(r.arrival) : null;
        case 'departure': return r.departure ? formatTime(r.departure) : r.inside ? '99' : null;
        case 'status': return STATUS_ORDER[r.status];
      }
    };
    rows.sort((a, b) => (sort.dir === 'asc' ? 1 : -1) * compare(val(a), val(b)) || (sort.key !== 'date' ? b.date.localeCompare(a.date) : 0));
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, sort, st]);

  const page = Number(q.sahifa) || 1;
  const size = Number(q.soni) || 25;
  const visible = printing ? sorted : sorted.slice((page - 1) * size, page * size);
  const hasFilter = !!(q.holat || q.fakultet || q.kafedra || q.yonalish || q.kurs || q.guruh || q.qidiruv || q.from !== today || q.to !== today);
  const clear = () => {
    resetQ();
    setSearch('');
  };

  const doExport = () =>
    exportExcel('Talabalar_davomati', [
      {
        name: 'Davomat',
        title: `Talabalar davomati — ${formatRange(q.from, q.to)}`,
        rows: sorted.map((r) => ({
          'Turniket ID': r.person.turnstileId,
          'F.I.Sh': fullName(r.person),
          'Talaba ID': r.person.studentId,
          Guruh: groupName(r.person.groupId),
          "Yo'nalish": dirName(r.person.directionId),
          Kurs: COURSE_LABELS[r.person.course],
          Sana: formatShortDate(r.date),
          'Kelgan vaqti': r.arrival ? formatTime(r.arrival) : '—',
          'Ketgan vaqti': r.inside ? 'Binoda' : r.departure ? formatTime(r.departure) : '—',
          Holat: STATUS_LABEL[r.status],
          'Kechikish (daqiqa)': r.lateMinutes || '',
          'Ota-ona telefoni': r.person.parents[0]?.phone ?? '',
        })),
      },
    ]);

  return (
    <div>
      <PageHeader
        title="Talabalar davomati"
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            {formatRange(q.from, q.to)}
            {live && <LiveDot />}
          </span>
        }
        actions={<ExportPrintButtons onExport={doExport} onPrint={print} />}
      />
      <PrintTitle title="Talabalar davomati" sub={formatRange(q.from, q.to)} />
      <SummaryChips summary={data?.summary ?? null} active={q.holat as StatusFilter} onPick={(s) => setQ({ holat: s, sahifa: '1' })} />

      <div className="no-print card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <DateRangePicker from={q.from} to={q.to} onChange={(from, to) => setQ({ from, to, sahifa: '1' })} />
        <Select aria-label="Fakultet" value={q.fakultet} onChange={(e) => setQ({ fakultet: e.target.value, kafedra: '', yonalish: '', guruh: '', sahifa: '1' })} placeholder="Barcha fakultetlar" options={(st?.faculties ?? []).map((d) => ({ value: d.id, label: d.name }))} />
        <Select aria-label="Kafedra" value={q.kafedra} onChange={(e) => setQ({ kafedra: e.target.value, yonalish: '', guruh: '', sahifa: '1' })} placeholder="Barcha kafedralar" options={deps.map((d) => ({ value: d.id, label: d.name }))} />
        <Select aria-label="Yo'nalish" value={q.yonalish} onChange={(e) => setQ({ yonalish: e.target.value, guruh: '', sahifa: '1' })} placeholder="Barcha yo'nalishlar" options={dirs.map((d) => ({ value: d.id, label: d.name }))} />
        <Select aria-label="Kurs" value={q.kurs} onChange={(e) => setQ({ kurs: e.target.value, guruh: '', sahifa: '1' })} placeholder="Barcha kurslar" options={COURSE_OPTIONS} />
        <Select aria-label="Guruh" value={q.guruh} onChange={(e) => setQ({ guruh: e.target.value, sahifa: '1' })} placeholder="Barcha guruhlar" options={groups.map((g) => ({ value: g.id, label: g.name }))} />
        <Select
          aria-label="Holat"
          value={q.holat}
          onChange={(e) => setQ({ holat: e.target.value, sahifa: '1' })}
          options={[
            { value: '', label: 'Barchasi' },
            { value: 'keldi', label: 'Keldi' },
            { value: 'kechikdi', label: 'Kechikdi' },
            { value: 'kelmadi', label: 'Kelmadi' },
            { value: 'binoda', label: 'Binoda' },
          ]}
        />
        <Input aria-label="Qidirish" icon={<Search size={16} />} placeholder="F.I.Sh, Talaba ID yoki Turniket ID bo'yicha qidirish" value={search} onChange={(e) => setSearch(e.target.value)} />
        {hasFilter && (
          <div className="sm:col-span-2 lg:col-span-4">
            <ClearFiltersButton onClick={clear} />
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} cols={8} />
        ) : error ? (
          <ErrorState onRetry={reload} />
        ) : !sorted.length ? (
          <EmptyState text="Tanlangan filtrlar bo'yicha ma'lumot topilmadi" action={hasFilter ? <ClearFiltersButton onClick={clear} /> : undefined} />
        ) : (
          <>
            <div className="print-overflow-visible max-h-[calc(100vh-260px)] min-h-[300px] overflow-auto">
              <table className="w-full min-w-[1200px] border-separate border-spacing-0">
                <thead className="sticky top-0 z-[2]">
                  <tr className="[&>th]:border-b [&>th]:border-border [&>th]:bg-surface-2">
                    <SortTh k="turnstile" sort={sort} onSort={toggleSort} className="sticky-col left-0 z-[3]">Turniket ID</SortTh>
                    <SortTh k="name" sort={sort} onSort={toggleSort}>Talaba (F.I.Sh)</SortTh>
                    <SortTh k="group" sort={sort} onSort={toggleSort}>Guruh</SortTh>
                    <SortTh k="direction" sort={sort} onSort={toggleSort}>Yo'nalish</SortTh>
                    <SortTh k="date" sort={sort} onSort={toggleSort}>Sana</SortTh>
                    <SortTh k="arrival" sort={sort} onSort={toggleSort}>Kelgan vaqti</SortTh>
                    <SortTh k="departure" sort={sort} onSort={toggleSort}>Ketgan vaqti</SortTh>
                    <SortTh k="status" sort={sort} onSort={toggleSort}>Holat</SortTh>
                    <th className="th no-print text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.key} onClick={() => setDrawer(r)} className="group cursor-pointer bg-surface transition-colors hover:bg-surface-2 [&>td]:border-b [&>td]:border-border">
                      <td className="td sticky-col bg-surface group-hover:bg-surface-2">
                        <Pill tone="primary">{r.person.turnstileId}</Pill>
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-3">
                          <Avatar name={fullName(r.person)} photo={r.person.photo} />
                          <div className="min-w-0">
                            <div className="whitespace-nowrap font-semibold text-text">{fullName(r.person)}</div>
                            <div className="text-xs text-muted tabular">Talaba ID: {r.person.studentId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="td">
                        <Pill tone="neutral">{groupName(r.person.groupId)}</Pill>
                      </td>
                      <td className="td max-w-[220px] text-muted">{dirName(r.person.directionId)}</td>
                      <td className="td whitespace-nowrap text-muted">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays size={14} />
                          {formatFullDate(r.date)}
                        </span>
                      </td>
                      <td className="td whitespace-nowrap">
                        <ArrivalCell row={r} />
                      </td>
                      <td className="td whitespace-nowrap">
                        <DepartureCell row={r} />
                      </td>
                      <td className="td whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <RowStatus row={r} />
                          <ReasonBadge reason={r.reason} />
                        </div>
                      </td>
                      <td className="td no-print text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex gap-1">
                          {r.status === 'kelmadi' && <ParentPhoneButton parents={r.person.parents} />}
                          {r.status === 'kelmadi' && can('addReason') && (
                            <IconButton size="sm" label="Izoh qo'shish" onClick={() => setReasonRow(r)}>
                              <MessageSquarePlus size={16} />
                            </IconButton>
                          )}
                          <IconButton size="sm" label="Ko'rish" onClick={() => setDrawer(r)}>
                            <Eye size={16} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={size} total={sorted.length} onPage={(p) => setQ({ sahifa: String(p) })} onPageSize={(n) => setQ({ soni: String(n), sahifa: '1' })} />
          </>
        )}
      </div>

      <ProfileDrawer row={drawer} onClose={() => setDrawer(null)} />
      {reasonRow && (
        <ReasonModal open={!!reasonRow} onClose={() => setReasonRow(null)} type="student" personId={reasonRow.personId} date={reasonRow.date} initial={reasonRow.reason} onSaved={refresh} />
      )}
    </div>
  );
}
