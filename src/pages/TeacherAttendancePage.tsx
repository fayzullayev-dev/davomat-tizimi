import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Eye, MessageSquarePlus, Search } from 'lucide-react';
import * as api from '@/services/api';
import type { StatusFilter, TeacherAttendanceRow } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useLive, useNow } from '@/context/LiveContext';
import { formatDuration, formatFullDate, formatRange, formatShortDate, formatTime, todayISO } from '@/utils/date';
import { POSITIONS, fullName } from '@/utils/format';
import { exportExcel } from '@/utils/excel';
import { useAsync, useDebounced, useDocumentTitle, useQueryState, useSort, useStructure } from '@/utils/hooks';
import { Avatar, Pill, STATUS_LABEL } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Form';
import { DateRangePicker } from '@/components/ui/DatePicker';
import { EmptyState, ErrorState, PageHeader, Pagination, TableSkeleton } from '@/components/ui/Misc';
import { LiveDot } from '@/components/layout/Header';
import { ArrivalCell, DepartureCell, ReasonBadge, ReasonModal, RowStatus, WorkedCell, liveWorked } from '@/components/AttendanceBits';
import { ProfileDrawer } from '@/components/ProfileDrawer';
import { ClearFiltersButton, ExportPrintButtons, PrintTitle, STATUS_ORDER, SortTh, SummaryChips, compare, usePrint } from '@/components/attendance/Shared';

type SortKey = 'turnstile' | 'name' | 'department' | 'date' | 'arrival' | 'departure' | 'worked' | 'status';

export default function TeacherAttendancePage() {
  useDocumentTitle("O'qituvchilar davomati");
  const today = todayISO();
  const [q, setQ, resetQ] = useQueryState({ from: today, to: today, holat: '', kafedra: '', lavozim: '', qidiruv: '', sahifa: '1', soni: '25' });
  const [search, setSearch] = useState(q.qidiruv);
  const dSearch = useDebounced(search, 300);
  const st = useStructure();
  const { can } = useAuth();
  const { tick } = useLive();
  const now = useNow(60000);
  const live = q.to >= today;

  // Qidiruv maydoni URL bilan sinxron
  useEffect(() => {
    if (dSearch !== q.qidiruv) setQ({ qidiruv: dSearch, sahifa: '1' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dSearch]);

  const { data, loading, error, reload, refresh } = useAsync(
    () => api.getTeacherAttendance({ from: q.from, to: q.to, status: q.holat as StatusFilter, departmentId: q.kafedra, position: q.lavozim, search: q.qidiruv }),
    [q.from, q.to, q.holat, q.kafedra, q.lavozim, q.qidiruv],
    { silentDeps: [live ? tick : 0] },
  );

  const [sort, toggleSort] = useSort<SortKey>('name');
  const [drawer, setDrawer] = useState<TeacherAttendanceRow | null>(null);
  const [reasonRow, setReasonRow] = useState<TeacherAttendanceRow | null>(null);
  const [printing, print] = usePrint();

  const depName = (id: string) => st?.departments.find((d) => d.id === id)?.name ?? '—';

  const sorted = useMemo(() => {
    const rows = [...(data?.rows ?? [])];
    const val = (r: TeacherAttendanceRow): string | number | null => {
      switch (sort.key) {
        case 'turnstile': return r.person.turnstileId;
        case 'name': return fullName(r.person);
        case 'department': return depName(r.person.departmentId);
        case 'date': return r.date;
        case 'arrival': return r.arrival ? formatTime(r.arrival) : null;
        case 'departure': return r.departure ? formatTime(r.departure) : r.inside ? '99' : null;
        case 'worked': return r.arrival ? liveWorked(r, now) : null;
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
  const hasFilter = !!(q.holat || q.kafedra || q.lavozim || q.qidiruv || q.from !== today || q.to !== today);

  const doExport = () =>
    exportExcel("Oqituvchilar_davomati", [
      {
        name: 'Davomat',
        title: `O'qituvchilar davomati — ${formatRange(q.from, q.to)}`,
        rows: sorted.map((r) => ({
          'Turniket ID': r.person.turnstileId || 'Biriktirilmagan',
          'F.I.Sh': fullName(r.person),
          Lavozimi: r.person.position,
          Kafedra: depName(r.person.departmentId),
          Sana: formatShortDate(r.date),
          'Kelgan vaqti': r.arrival ? formatTime(r.arrival) : '—',
          'Ketgan vaqti': r.inside ? 'Binoda' : r.departure ? formatTime(r.departure) : '—',
          'Ishlagan vaqti': r.arrival ? formatDuration(liveWorked(r, now)) : '—',
          Holat: STATUS_LABEL[r.status],
          'Kechikish (daqiqa)': r.lateMinutes || '',
          Izoh: r.reason ? `${r.reason.type === 'sababli' ? 'Sababli' : 'Sababsiz'}${r.reason.note ? ': ' + r.reason.note : ''}` : '',
        })),
      },
    ]);

  const clear = () => {
    resetQ();
    setSearch('');
  };

  return (
    <div>
      <PageHeader
        title="O'qituvchilar davomati"
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            {formatRange(q.from, q.to)}
            {live && <LiveDot />}
          </span>
        }
        actions={<ExportPrintButtons onExport={doExport} onPrint={print} />}
      />
      <PrintTitle title="O'qituvchilar davomati" sub={formatRange(q.from, q.to)} />

      <SummaryChips summary={data?.summary ?? null} active={q.holat as StatusFilter} onPick={(s) => setQ({ holat: s, sahifa: '1' })} />

      <div className="no-print card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_1fr_1fr_1fr_minmax(240px,1.4fr)_auto]">
        <DateRangePicker from={q.from} to={q.to} onChange={(from, to) => setQ({ from, to, sahifa: '1' })} />
        <Select aria-label="Kafedra" value={q.kafedra} onChange={(e) => setQ({ kafedra: e.target.value, sahifa: '1' })} placeholder="Barcha kafedralar" options={(st?.departments ?? []).map((d) => ({ value: d.id, label: d.name }))} />
        <Select aria-label="Lavozim" value={q.lavozim} onChange={(e) => setQ({ lavozim: e.target.value, sahifa: '1' })} placeholder="Barcha lavozimlar" options={POSITIONS.map((p) => ({ value: p, label: p }))} />
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
        <Input aria-label="Qidirish" icon={<Search size={16} />} placeholder="F.I.Sh yoki Turniket ID bo'yicha qidirish" value={search} onChange={(e) => setSearch(e.target.value)} />
        {hasFilter && <ClearFiltersButton onClick={clear} />}
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
              <table className="w-full min-w-[1280px] border-separate border-spacing-0">
                <thead className="sticky top-0 z-[2]">
                  <tr className="bg-surface-2 [&>th]:border-b [&>th]:border-border [&>th]:bg-surface-2">
                    <SortTh k="turnstile" sort={sort} onSort={toggleSort} className="sticky-col left-0 z-[3]">Turniket ID</SortTh>
                    <SortTh k="name" sort={sort} onSort={toggleSort}>O'qituvchi (F.I.Sh)</SortTh>
                    <SortTh k="department" sort={sort} onSort={toggleSort}>Kafedra</SortTh>
                    <SortTh k="date" sort={sort} onSort={toggleSort}>Sana</SortTh>
                    <SortTh k="arrival" sort={sort} onSort={toggleSort}>Kelgan vaqti</SortTh>
                    <SortTh k="departure" sort={sort} onSort={toggleSort}>Ketgan vaqti</SortTh>
                    <SortTh k="worked" sort={sort} onSort={toggleSort}>Ishlagan vaqti</SortTh>
                    <SortTh k="status" sort={sort} onSort={toggleSort}>Holat</SortTh>
                    <th className="th no-print text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.key} onClick={() => setDrawer(r)} className="group cursor-pointer bg-surface transition-colors hover:bg-surface-2 [&>td]:border-b [&>td]:border-border">
                      <td className="td sticky-col bg-surface group-hover:bg-surface-2">
                        {r.person.turnstileId ? <Pill tone="primary">{r.person.turnstileId}</Pill> : <Pill tone="warning">Biriktirilmagan</Pill>}
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-3">
                          <Avatar name={fullName(r.person)} photo={r.person.photo} />
                          <div className="min-w-0">
                            <div className="whitespace-nowrap font-semibold text-text">{fullName(r.person)}</div>
                            <div className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-muted">{r.person.position}</div>
                          </div>
                        </div>
                      </td>
                      <td className="td max-w-[220px] text-muted">{depName(r.person.departmentId)}</td>
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
                        <WorkedCell row={r} />
                      </td>
                      <td className="td whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <RowStatus row={r} />
                          <ReasonBadge reason={r.reason} />
                        </div>
                      </td>
                      <td className="td no-print text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex gap-1">
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
        <ReasonModal open={!!reasonRow} onClose={() => setReasonRow(null)} type="teacher" personId={reasonRow.personId} date={reasonRow.date} initial={reasonRow.reason} onSaved={refresh} />
      )}
    </div>
  );
}
