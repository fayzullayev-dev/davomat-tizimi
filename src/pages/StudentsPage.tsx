import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpCircle, Eye, FileSpreadsheet, LayoutGrid, MoreVertical, Pencil, Phone, Plus, Search, Shuffle, Table2, Trash2, Upload, X } from 'lucide-react';
import * as api from '@/services/api';
import type { Student } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { COURSE_LABELS, COURSE_OPTIONS, STUDY_FORM_LABELS, formatNumber, fullName } from '@/utils/format';
import { formatShortDate } from '@/utils/date';
import { exportExcel } from '@/utils/excel';
import { useAsync, useDebounced, useDocumentTitle, useQueryState, useSort, useStructure } from '@/utils/hooks';
import { Avatar, Pill } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Checkbox, Field, Input, Select } from '@/components/ui/Form';
import { ConfirmModal, Modal } from '@/components/ui/Modal';
import { DropdownMenu, EmptyState, ErrorState, PageHeader, Pagination, Skeleton, TableSkeleton, Tabs, type MenuItem } from '@/components/ui/Misc';
import { ClearFiltersButton, SortTh, compare } from '@/components/attendance/Shared';
import { ImportModal } from '@/components/ImportModal';

type SortKey = 'name' | 'studentId' | 'group' | 'direction' | 'course' | 'turnstile';

export default function StudentsPage() {
  useDocumentTitle('Talabalar');
  const nav = useNavigate();
  const toast = useToast();
  const { can } = useAuth();
  const manage = can('manage');
  const st = useStructure();
  const [q, setQ, resetQ] = useQueryState({ fakultet: '', kafedra: '', yonalish: '', kurs: '', guruh: '', shakl: '', qidiruv: '', korinish: 'jadval', sahifa: '1', soni: '25' });
  const [search, setSearch] = useState(q.qidiruv);
  const dSearch = useDebounced(search, 250);
  useEffect(() => {
    if (dSearch !== q.qidiruv) setQ({ qidiruv: dSearch, sahifa: '1' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dSearch]);
  const { data, loading, error, reload, refresh } = useAsync(() => api.getStudents(), []);
  const [sort, toggleSort] = useSort<SortKey>('name');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<null | 'delete' | 'deleteOne' | 'group' | 'promote'>(null);
  const [target, setTarget] = useState<Student | null>(null);
  const [newGroup, setNewGroup] = useState('');
  const [groupErr, setGroupErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const groupName = (id: string) => st?.groups.find((g) => g.id === id)?.name ?? '—';
  const dirName = (id: string) => st?.directions.find((d) => d.id === id)?.name ?? '—';
  const deps = (st?.departments ?? []).filter((d) => !q.fakultet || d.facultyId === q.fakultet);
  const dirs = (st?.directions ?? []).filter((d) => (!q.kafedra || d.departmentId === q.kafedra) && deps.some((x) => x.id === d.departmentId));
  const groups = (st?.groups ?? []).filter((g) => (!q.yonalish || g.directionId === q.yonalish) && dirs.some((d) => d.id === g.directionId) && (!q.kurs || String(g.course) === q.kurs));

  const filtered = useMemo(() => {
    const s = q.qidiruv.toLowerCase();
    const rows = (data ?? []).filter(
      (x) =>
        (!q.fakultet || x.facultyId === q.fakultet) &&
        (!q.kafedra || x.departmentId === q.kafedra) &&
        (!q.yonalish || x.directionId === q.yonalish) &&
        (!q.kurs || String(x.course) === q.kurs) &&
        (!q.guruh || x.groupId === q.guruh) &&
        (!q.shakl || x.studyForm === q.shakl) &&
        (!s || fullName(x).toLowerCase().includes(s) || x.studentId.includes(s) || x.turnstileId.includes(s)),
    );
    const val = (x: Student) => ({ name: fullName(x), studentId: x.studentId, group: groupName(x.groupId), direction: dirName(x.directionId), course: x.course, turnstile: x.turnstileId })[sort.key];
    return rows.sort((a, b) => (sort.dir === 'asc' ? 1 : -1) * compare(val(a), val(b)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, q.fakultet, q.kafedra, q.yonalish, q.kurs, q.guruh, q.shakl, q.qidiruv, sort, st]);

  const page = Number(q.sahifa) || 1;
  const size = Number(q.soni) || 25;
  const visible = filtered.slice((page - 1) * size, page * size);
  const hasFilter = !!(q.fakultet || q.kafedra || q.yonalish || q.kurs || q.guruh || q.shakl || q.qidiruv);
  const allOnPage = visible.length > 0 && visible.every((x) => sel.has(x.id));
  const toggle = (id: string) => setSel((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });

  const menu = (x: Student): MenuItem[] => {
    const items: MenuItem[] = [{ label: "Ko'rish", icon: <Eye size={16} />, onClick: () => nav(`/talabalar/${x.id}`) }];
    if (manage) {
      items.push({ label: 'Tahrirlash', icon: <Pencil size={16} />, onClick: () => nav(`/talabalar/${x.id}/tahrirlash`) });
      items.push({ label: "O'chirish", icon: <Trash2 size={16} />, danger: true, onClick: () => { setTarget(x); setModal('deleteOne'); } });
    }
    return items;
  };

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(msg);
      setModal(null);
      setSel(new Set());
      void refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const doExport = () =>
    exportExcel('Talabalar', [
      {
        name: 'Talabalar',
        rows: filtered.map((x) => ({
          'F.I.Sh': fullName(x),
          'Talaba ID': x.studentId,
          Guruh: groupName(x.groupId),
          "Yo'nalish": dirName(x.directionId),
          Kurs: COURSE_LABELS[x.course],
          "Ta'lim shakli": STUDY_FORM_LABELS[x.studyForm],
          "Tug'ilgan sana": formatShortDate(x.birthDate),
          'Telefon raqami': x.phone,
          'Ota-ona F.I.Sh': x.parents[0]?.fullName ?? '',
          'Ota-ona telefoni': x.parents[0]?.phone ?? '',
          'Turniket ID': x.turnstileId,
        })),
      },
    ]);

  const ActionsBar = manage && sel.size > 0 && (
    <div className="anim-pop mb-3 flex flex-wrap items-center gap-2 rounded-card bg-primary-soft px-4 py-2.5">
      <span className="text-sm font-semibold text-primary-ink">{sel.size} ta tanlandi</span>
      <div className="ml-auto flex flex-wrap gap-2">
        <Button size="sm" variant="outline" icon={<Shuffle size={14} />} onClick={() => { setNewGroup(''); setGroupErr(''); setModal('group'); }}>
          Guruhni o'zgartirish
        </Button>
        <Button size="sm" variant="outline" icon={<ArrowUpCircle size={14} />} onClick={() => setModal('promote')}>
          Keyingi kursga o'tkazish
        </Button>
        <Button size="sm" variant="danger" icon={<Trash2 size={14} />} onClick={() => setModal('delete')}>
          Tanlanganlarni o'chirish
        </Button>
        <Button size="sm" variant="ghost" icon={<X size={14} />} onClick={() => setSel(new Set())}>
          Bekor qilish
        </Button>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Talabalar"
        subtitle={<>Jami: {formatNumber(data?.length ?? 0)} nafar</>}
        actions={
          <>
            {manage && (
              <>
                <Button icon={<Plus size={16} />} onClick={() => nav('/talabalar/qoshish')}>
                  Talaba qo'shish
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

      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select aria-label="Fakultet" value={q.fakultet} onChange={(e) => setQ({ fakultet: e.target.value, kafedra: '', yonalish: '', guruh: '', sahifa: '1' })} placeholder="Barcha fakultetlar" options={(st?.faculties ?? []).map((d) => ({ value: d.id, label: d.name }))} />
        <Select aria-label="Kafedra" value={q.kafedra} onChange={(e) => setQ({ kafedra: e.target.value, yonalish: '', guruh: '', sahifa: '1' })} placeholder="Barcha kafedralar" options={deps.map((d) => ({ value: d.id, label: d.name }))} />
        <Select aria-label="Yo'nalish" value={q.yonalish} onChange={(e) => setQ({ yonalish: e.target.value, guruh: '', sahifa: '1' })} placeholder="Barcha yo'nalishlar" options={dirs.map((d) => ({ value: d.id, label: d.name }))} />
        <Select aria-label="Kurs" value={q.kurs} onChange={(e) => setQ({ kurs: e.target.value, guruh: '', sahifa: '1' })} placeholder="Barcha kurslar" options={COURSE_OPTIONS} />
        <Select aria-label="Guruh" value={q.guruh} onChange={(e) => setQ({ guruh: e.target.value, sahifa: '1' })} placeholder="Barcha guruhlar" options={groups.map((g) => ({ value: g.id, label: g.name }))} />
        <Select aria-label="Ta'lim shakli" value={q.shakl} onChange={(e) => setQ({ shakl: e.target.value, sahifa: '1' })} placeholder="Barcha ta'lim shakllari" options={Object.entries(STUDY_FORM_LABELS).map(([value, label]) => ({ value, label }))} />
        <div className="sm:col-span-2">
          <Input aria-label="Qidirish" icon={<Search size={16} />} placeholder="F.I.Sh, Talaba ID yoki Turniket ID" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
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
        {hasFilter && <ClearFiltersButton onClick={() => { resetQ(); setSearch(''); }} />}
      </div>

      {ActionsBar}

      {q.korinish === 'kartochkalar' ? (
        loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-48 !rounded-card" />)}
          </div>
        ) : error ? (
          <div className="card"><ErrorState onRetry={reload} /></div>
        ) : !filtered.length ? (
          <div className="card"><EmptyState text="Tanlangan filtrlar bo'yicha ma'lumot topilmadi" /></div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {visible.map((x) => (
                <div key={x.id} className={`card relative flex flex-col items-center p-5 text-center transition-shadow hover:shadow-pop ${sel.has(x.id) ? 'ring-2 ring-primary' : ''}`}>
                  {manage && (
                    <div className="absolute left-3 top-3">
                      <Checkbox checked={sel.has(x.id)} onChange={() => toggle(x.id)} aria-label="Tanlash" />
                    </div>
                  )}
                  <div className="absolute right-3 top-3">
                    <DropdownMenu label="Amallar" trigger={<MoreVertical size={16} />} items={menu(x)} />
                  </div>
                  <button className="focus-ring flex flex-col items-center rounded-ctl" onClick={() => nav(`/talabalar/${x.id}`)}>
                    <Avatar name={fullName(x)} photo={x.photo} size={64} />
                    <div className="mt-3 font-semibold text-text">{fullName(x)}</div>
                  </button>
                  <div className="mt-0.5 text-xs text-muted tabular">Talaba ID: {x.studentId}</div>
                  <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                    <Pill tone="neutral">{groupName(x.groupId)}</Pill>
                    <Pill tone="info">{COURSE_LABELS[x.course]}</Pill>
                    <Pill tone="primary">ID: {x.turnstileId}</Pill>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted tabular">
                    <Phone size={12} /> {x.phone}
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
            <TableSkeleton rows={8} cols={8} />
          ) : error ? (
            <ErrorState onRetry={reload} />
          ) : !filtered.length ? (
            <EmptyState text="Tanlangan filtrlar bo'yicha ma'lumot topilmadi" />
          ) : (
            <>
              <div className="max-h-[calc(100vh-300px)] min-h-[300px] overflow-auto">
                <table className="w-full min-w-[1200px] border-separate border-spacing-0">
                  <thead className="sticky top-0 z-[2]">
                    <tr className="[&>th]:border-b [&>th]:border-border [&>th]:bg-surface-2">
                      <th className="th sticky-col z-[3] w-24">
                        <div className="flex items-center gap-3">
                          {manage && (
                            <Checkbox
                              checked={allOnPage}
                              aria-label="Barchasini tanlash"
                              onChange={(v) => setSel((s) => {
                                const n = new Set(s);
                                visible.forEach((x) => (v ? n.add(x.id) : n.delete(x.id)));
                                return n;
                              })}
                            />
                          )}
                          Rasm
                        </div>
                      </th>
                      <SortTh k="name" sort={sort} onSort={toggleSort}>F.I.Sh</SortTh>
                      <SortTh k="studentId" sort={sort} onSort={toggleSort}>Talaba ID</SortTh>
                      <SortTh k="group" sort={sort} onSort={toggleSort}>Guruh</SortTh>
                      <SortTh k="direction" sort={sort} onSort={toggleSort}>Yo'nalish</SortTh>
                      <SortTh k="course" sort={sort} onSort={toggleSort}>Kurs</SortTh>
                      <th className="th">Telefon raqami</th>
                      <th className="th">Ota-ona telefoni</th>
                      <SortTh k="turnstile" sort={sort} onSort={toggleSort}>Turniket ID</SortTh>
                      <th className="th text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((x) => (
                      <tr key={x.id} onClick={() => nav(`/talabalar/${x.id}`)} className={`group cursor-pointer hover:bg-surface-2 [&>td]:border-b [&>td]:border-border ${sel.has(x.id) ? 'bg-primary-soft' : 'bg-surface'}`}>
                        <td className={`td sticky-col group-hover:bg-surface-2 ${sel.has(x.id) ? 'bg-primary-soft' : 'bg-surface'}`} onClick={(e) => manage && e.stopPropagation()}>
                          <div className="flex items-center gap-3">
                            {manage && <Checkbox checked={sel.has(x.id)} onChange={() => toggle(x.id)} aria-label="Tanlash" />}
                            <Avatar name={fullName(x)} photo={x.photo} />
                          </div>
                        </td>
                        <td className="td font-semibold">{fullName(x)}</td>
                        <td className="td tabular text-muted">{x.studentId}</td>
                        <td className="td"><Pill tone="neutral">{groupName(x.groupId)}</Pill></td>
                        <td className="td max-w-[220px] text-muted">{dirName(x.directionId)}</td>
                        <td className="td whitespace-nowrap text-muted">{COURSE_LABELS[x.course]}</td>
                        <td className="td whitespace-nowrap tabular text-muted">{x.phone}</td>
                        <td className="td whitespace-nowrap tabular text-muted">{x.parents[0]?.phone ?? '—'}</td>
                        <td className="td"><Pill tone="primary">{x.turnstileId}</Pill></td>
                        <td className="td text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu label="Amallar" trigger={<MoreVertical size={16} />} items={menu(x)} />
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

      <ConfirmModal open={modal === 'delete'} onClose={() => setModal(null)} loading={busy} danger confirmText="O'chirish" title="Rostdan ham o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi." text={`${sel.size} ta talaba o'chiriladi.`} onConfirm={() => run(() => api.deleteStudents([...sel]), "Talabalar o'chirildi")} />
      <ConfirmModal open={modal === 'deleteOne'} onClose={() => setModal(null)} loading={busy} danger confirmText="O'chirish" title="Rostdan ham o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi." text={target ? fullName(target) : undefined} onConfirm={() => run(() => api.deleteStudents([target!.id]), "Talaba o'chirildi")} />
      <ConfirmModal open={modal === 'promote'} onClose={() => setModal(null)} loading={busy} confirmText="O'tkazish" title={`${sel.size} ta talabani keyingi kursga o'tkazmoqchimisiz?`} text="Bitiruvchi kurs talabalari o'tkazilmaydi." onConfirm={() => run(() => api.promoteStudents([...sel]), "Talabalar keyingi kursga o'tkazildi")} />
      <Modal
        open={modal === 'group'}
        onClose={() => setModal(null)}
        title="Guruhni o'zgartirish"
        description={`${sel.size} ta talaba uchun yangi guruhni tanlang`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(null)}>Bekor qilish</Button>
            <Button loading={busy} onClick={() => (newGroup ? void run(() => api.changeStudentsGroup([...sel], newGroup), "Guruh o'zgartirildi") : setGroupErr("Bu maydon to'ldirilishi shart"))}>
              Saqlash
            </Button>
          </>
        }
      >
        <Field label="Yangi guruh" required error={groupErr} htmlFor="new-group">
          <Select id="new-group" value={newGroup} invalid={!!groupErr} onChange={(e) => { setNewGroup(e.target.value); setGroupErr(''); }} placeholder="Guruhni tanlang" options={(st?.groups ?? []).map((g) => ({ value: g.id, label: `${g.name} — ${COURSE_LABELS[g.course]}` }))} />
        </Field>
      </Modal>
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} type="student" onDone={refresh} />
    </div>
  );
}
