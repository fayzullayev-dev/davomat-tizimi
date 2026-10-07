import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, FileSpreadsheet, LayoutGrid, MoreVertical, Pencil, Phone, Plus, Search, Table2, Trash2, Upload, UserMinus, UserPlus } from 'lucide-react';
import * as api from '@/services/api';
import type { Teacher } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DEGREES, POSITIONS, formatNumber, fullName, maskJshshir, maskPassport } from '@/utils/format';
import { formatShortDate } from '@/utils/date';
import { exportExcel } from '@/utils/excel';
import { useAsync, useDebounced, useDocumentTitle, useQueryState, useSort, useStructure } from '@/utils/hooks';
import { Avatar, Pill } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Form';
import { ConfirmModal } from '@/components/ui/Modal';
import { DropdownMenu, EmptyState, ErrorState, PageHeader, Pagination, Skeleton, TableSkeleton, Tabs, type MenuItem } from '@/components/ui/Misc';
import { ClearFiltersButton, SortTh, compare } from '@/components/attendance/Shared';
import { ImportModal } from '@/components/ImportModal';

type SortKey = 'name' | 'position' | 'department' | 'turnstile' | 'status';

export default function TeachersPage() {
  useDocumentTitle("O'qituvchilar");
  const nav = useNavigate();
  const toast = useToast();
  const { can } = useAuth();
  const st = useStructure();
  const [q, setQ, resetQ] = useQueryState({ kafedra: '', lavozim: '', daraja: '', holati: '', qidiruv: '', korinish: 'jadval', sahifa: '1', soni: '25' });
  const [search, setSearch] = useState(q.qidiruv);
  const dSearch = useDebounced(search, 250);
  useEffect(() => {
    if (dSearch !== q.qidiruv) setQ({ qidiruv: dSearch, sahifa: '1' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dSearch]);
  const { data, loading, error, reload, refresh } = useAsync(() => api.getTeachers(), []);
  const [sort, toggleSort] = useSort<SortKey>('name');
  const [confirm, setConfirm] = useState<{ kind: 'delete' | 'deactivate'; t: Teacher } | null>(null);
  const [busy, setBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const depName = (id: string) => st?.departments.find((d) => d.id === id)?.name ?? '—';

  const filtered = useMemo(() => {
    const s = q.qidiruv.toLowerCase();
    const rows = (data ?? []).filter(
      (t) =>
        (!q.kafedra || t.departmentId === q.kafedra) &&
        (!q.lavozim || t.position === q.lavozim) &&
        (!q.daraja || t.degree === q.daraja) &&
        (!q.holati || (q.holati === 'faol' ? t.active : !t.active)) &&
        (!s || fullName(t).toLowerCase().includes(s) || t.turnstileId.includes(s) || t.phone.replace(/\D/g, '').includes(s.replace(/\D/g, '') || '#')),
    );
    const val = (t: Teacher) => ({ name: fullName(t), position: t.position, department: depName(t.departmentId), turnstile: t.turnstileId, status: t.active ? 0 : 1 })[sort.key];
    return rows.sort((a, b) => (sort.dir === 'asc' ? 1 : -1) * compare(val(a), val(b)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, q.kafedra, q.lavozim, q.daraja, q.holati, q.qidiruv, sort, st]);

  const page = Number(q.sahifa) || 1;
  const size = Number(q.soni) || 25;
  const visible = filtered.slice((page - 1) * size, page * size);
  const hasFilter = !!(q.kafedra || q.lavozim || q.daraja || q.holati || q.qidiruv);
  const showFull = can('viewPassport');

  const menu = (t: Teacher): MenuItem[] => {
    const items: MenuItem[] = [{ label: "Ko'rish", icon: <Eye size={16} />, onClick: () => nav(`/oqituvchilar/${t.id}`) }];
    if (can('manage')) {
      items.push({ label: 'Tahrirlash', icon: <Pencil size={16} />, onClick: () => nav(`/oqituvchilar/${t.id}/tahrirlash`) });
      items.push(
        t.active
          ? { label: 'Nofaol qilish', icon: <UserMinus size={16} />, onClick: () => setConfirm({ kind: 'deactivate', t }) }
          : { label: 'Faol qilish', icon: <UserPlus size={16} />, onClick: () => void toggleActive(t) },
      );
      items.push({ label: "O'chirish", icon: <Trash2 size={16} />, danger: true, onClick: () => setConfirm({ kind: 'delete', t }) });
    }
    return items;
  };

  const toggleActive = async (t: Teacher) => {
    try {
      await api.setTeacherActive(t.id, !t.active);
      toast.success(t.active ? "O'qituvchi nofaol qilindi" : "O'qituvchi faol qilindi");
      void refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const doConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === 'delete') {
        await api.deleteTeacher(confirm.t.id);
        toast.success("O'qituvchi o'chirildi");
      } else {
        await api.setTeacherActive(confirm.t.id, false);
        toast.success("O'qituvchi nofaol qilindi");
      }
      setConfirm(null);
      void refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const doExport = () =>
    exportExcel('Oqituvchilar', [
      {
        name: "O'qituvchilar",
        rows: filtered.map((t) => ({
          Familiya: t.lastName,
          Ism: t.firstName,
          'Otasining ismi': t.middleName,
          Lavozimi: t.position,
          'Ilmiy daraja': t.degree,
          Kafedra: depName(t.departmentId),
          'Telefon raqami': t.phone,
          'Turniket ID': t.turnstileId || 'Biriktirilmagan',
          'Pasport': showFull ? t.passport : maskPassport(t.passport),
          JSHSHIR: showFull ? t.jshshir : maskJshshir(t.jshshir),
          'Ishga qabul qilingan sana': formatShortDate(t.hiredDate),
          Stavka: t.rate,
          Holati: t.active ? 'Faol' : 'Nofaol',
        })),
      },
    ]);

  return (
    <div>
      <PageHeader
        title="O'qituvchilar"
        subtitle={<>Jami: {formatNumber(data?.length ?? 0)} nafar</>}
        actions={
          <>
            {can('manage') && (
              <>
                <Button icon={<Plus size={16} />} onClick={() => nav('/oqituvchilar/qoshish')}>
                  O'qituvchi qo'shish
                </Button>
                <Button variant="outline" icon={<Upload size={16} />} onClick={() => setImportOpen(true)}>
                  Excel orqali import
                </Button>
              </>
            )}
            <Button variant="outline" icon={<FileSpreadsheet size={16} />} onClick={doExport}>
              Excelga yuklab olish
            </Button>
          </>
        }
      />

      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_minmax(220px,1.4fr)]">
        <Select aria-label="Kafedra" value={q.kafedra} onChange={(e) => setQ({ kafedra: e.target.value, sahifa: '1' })} placeholder="Barcha kafedralar" options={(st?.departments ?? []).map((d) => ({ value: d.id, label: d.name }))} />
        <Select aria-label="Lavozim" value={q.lavozim} onChange={(e) => setQ({ lavozim: e.target.value, sahifa: '1' })} placeholder="Barcha lavozimlar" options={POSITIONS.map((p) => ({ value: p, label: p }))} />
        <Select aria-label="Ilmiy daraja" value={q.daraja} onChange={(e) => setQ({ daraja: e.target.value, sahifa: '1' })} placeholder="Barcha ilmiy darajalar" options={DEGREES.map((p) => ({ value: p, label: p }))} />
        <Select
          aria-label="Holati"
          value={q.holati}
          onChange={(e) => setQ({ holati: e.target.value, sahifa: '1' })}
          placeholder="Barcha holatlar"
          options={[
            { value: 'faol', label: 'Faol' },
            { value: 'nofaol', label: 'Nofaol' },
          ]}
        />
        <Input aria-label="Qidirish" icon={<Search size={16} />} placeholder="F.I.Sh, telefon yoki Turniket ID" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Tabs
          value={q.korinish as 'jadval' | 'kartochkalar'}
          onChange={(v) => setQ({ korinish: v })}
          items={[
            { value: 'jadval', label: <span className="inline-flex items-center gap-1.5"><Table2 size={15} /> Jadval</span> },
            { value: 'kartochkalar', label: <span className="inline-flex items-center gap-1.5"><LayoutGrid size={15} /> Kartochkalar</span> },
          ]}
        />
        {hasFilter && (
          <ClearFiltersButton
            onClick={() => {
              resetQ();
              setSearch('');
            }}
          />
        )}
      </div>

      {q.korinish === 'kartochkalar' ? (
        loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-48 !rounded-card" />
            ))}
          </div>
        ) : error ? (
          <div className="card"><ErrorState onRetry={reload} /></div>
        ) : !filtered.length ? (
          <div className="card"><EmptyState text="Tanlangan filtrlar bo'yicha ma'lumot topilmadi" /></div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {visible.map((t) => (
                <div key={t.id} className="card relative flex flex-col items-center p-5 text-center transition-shadow hover:shadow-pop">
                  <div className="absolute right-3 top-3">
                    <DropdownMenu label="Amallar" trigger={<MoreVertical size={16} />} items={menu(t)} />
                  </div>
                  <button className="focus-ring flex flex-col items-center rounded-ctl" onClick={() => nav(`/oqituvchilar/${t.id}`)}>
                    <Avatar name={fullName(t)} photo={t.photo} size={64} />
                    <div className="mt-3 font-semibold text-text">{fullName(t)}</div>
                  </button>
                  <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted">{t.position}</div>
                  <div className="mt-1 line-clamp-1 text-xs text-muted">{depName(t.departmentId)}</div>
                  <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                    {t.turnstileId ? <Pill tone="primary">ID: {t.turnstileId}</Pill> : <Pill tone="warning">Biriktirilmagan</Pill>}
                    {t.active ? <Pill tone="success">Faol</Pill> : <Pill tone="neutral">Nofaol</Pill>}
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted tabular">
                    <Phone size={12} /> {t.phone}
                  </div>
                </div>
              ))}
            </div>
            <div className="card mt-4">
              <Pagination page={page} pageSize={size} total={filtered.length} onPage={(p) => setQ({ sahifa: String(p) })} onPageSize={(n) => setQ({ soni: String(n), sahifa: '1' })} />
            </div>
          </>
        )
      ) : (
        <div className="card overflow-hidden">
          {loading ? (
            <TableSkeleton rows={8} cols={7} />
          ) : error ? (
            <ErrorState onRetry={reload} />
          ) : !filtered.length ? (
            <EmptyState text="Tanlangan filtrlar bo'yicha ma'lumot topilmadi" />
          ) : (
            <>
              <div className="max-h-[calc(100vh-300px)] min-h-[300px] overflow-auto">
                <table className="w-full min-w-[980px] border-separate border-spacing-0">
                  <thead className="sticky top-0 z-[2]">
                    <tr className="[&>th]:border-b [&>th]:border-border [&>th]:bg-surface-2">
                      <th className="th sticky-col z-[3] w-16">Rasm</th>
                      <SortTh k="name" sort={sort} onSort={toggleSort}>F.I.Sh</SortTh>
                      <SortTh k="position" sort={sort} onSort={toggleSort}>Lavozimi</SortTh>
                      <SortTh k="department" sort={sort} onSort={toggleSort}>Kafedra</SortTh>
                      <th className="th">Telefon raqami</th>
                      <SortTh k="turnstile" sort={sort} onSort={toggleSort}>Turniket ID</SortTh>
                      <SortTh k="status" sort={sort} onSort={toggleSort}>Holati</SortTh>
                      <th className="th text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((t) => (
                      <tr key={t.id} onClick={() => nav(`/oqituvchilar/${t.id}`)} className="group cursor-pointer bg-surface hover:bg-surface-2 [&>td]:border-b [&>td]:border-border">
                        <td className="td sticky-col bg-surface group-hover:bg-surface-2">
                          <Avatar name={fullName(t)} photo={t.photo} />
                        </td>
                        <td className="td font-semibold">{fullName(t)}</td>
                        <td className="td text-muted">{t.position}</td>
                        <td className="td max-w-[240px] text-muted">{depName(t.departmentId)}</td>
                        <td className="td whitespace-nowrap tabular text-muted">{t.phone}</td>
                        <td className="td">{t.turnstileId ? <Pill tone="primary">{t.turnstileId}</Pill> : <Pill tone="warning">Biriktirilmagan</Pill>}</td>
                        <td className="td">{t.active ? <Pill tone="success">Faol</Pill> : <Pill tone="neutral">Nofaol</Pill>}</td>
                        <td className="td text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu label="Amallar" trigger={<MoreVertical size={16} />} items={menu(t)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} pageSize={size} total={filtered.length} onPage={(p) => setQ({ sahifa: String(p) })} onPageSize={(n) => setQ({ soni: String(n), sahifa: '1' })} />
            </>
          )}
        </div>
      )}

      <ConfirmModal
        open={confirm?.kind === 'deactivate'}
        onClose={() => setConfirm(null)}
        onConfirm={doConfirm}
        loading={busy}
        title="O'qituvchini nofaol qilmoqchimisiz? U davomat hisobotlarida ko'rinmaydi."
        confirmText="Nofaol qilish"
      />
      <ConfirmModal
        open={confirm?.kind === 'delete'}
        onClose={() => setConfirm(null)}
        onConfirm={doConfirm}
        loading={busy}
        danger
        title="Rostdan ham o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi."
        text={confirm ? fullName(confirm.t) : undefined}
        confirmText="O'chirish"
      />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} type="teacher" onDone={refresh} />
    </div>
  );
}
