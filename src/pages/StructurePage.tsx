import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, BookOpen, Building2, ChevronRight, GraduationCap, Landmark, Layers, Pencil, Plus, Trash2, Users } from 'lucide-react';
import * as api from '@/services/api';
import type { UnitKind } from '@/services/api';
import type { Course, Student, StudyForm, Teacher } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { COURSE_LABELS, COURSE_OPTIONS, STUDY_FORM_LABELS, fullName } from '@/utils/format';
import { reloadStructure, useAsync, useDocumentTitle, useStructure } from '@/utils/hooks';
import { Avatar, Pill } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Form';
import { ConfirmModal, Modal } from '@/components/ui/Modal';
import { Card, EmptyState, PageHeader, Skeleton } from '@/components/ui/Misc';

const KIND_LABEL: Record<UnitKind, string> = { faculty: 'Fakultet', department: 'Kafedra', direction: "Yo'nalish", group: 'Guruh' };
const KIND_ICON: Record<UnitKind, ReactNode> = {
  faculty: <Landmark size={16} />,
  department: <Building2 size={16} />,
  direction: <BookOpen size={16} />,
  group: <Layers size={16} />,
};
const PARENT_LABEL: Partial<Record<UnitKind, string>> = { department: 'Qaysi fakultetga tegishli', direction: 'Qaysi kafedraga tegishli', group: "Qaysi yo'nalishga tegishli" };

interface Sel {
  kind: UnitKind;
  id: string;
}
interface FormState {
  kind: UnitKind;
  id?: string;
  name: string;
  parent: string;
  course: string;
  studyForm: StudyForm;
}

export default function StructurePage() {
  useDocumentTitle('Fakultet va kafedralar');
  const st = useStructure();
  const nav = useNavigate();
  const toast = useToast();
  const { can } = useAuth();
  const manage = can('manage');
  const { data: people } = useAsync(() => Promise.all([api.getTeachers(), api.getStudents()]), []);
  const teachers: Teacher[] = people?.[0] ?? [];
  const students: Student[] = people?.[1] ?? [];
  const [open, setOpen] = useState<Set<string>>(new Set(['f1']));
  const [sel, setSel] = useState<Sel | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [formErr, setFormErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<Sel | null>(null);
  const [blocked, setBlocked] = useState(false);

  const counts = useMemo(() => {
    const c = { t: {} as Record<string, number>, s: {} as Record<string, number> };
    if (!st) return c;
    const inc = (m: Record<string, number>, k: string) => (m[k] = (m[k] ?? 0) + 1);
    teachers.forEach((t) => {
      inc(c.t, t.departmentId);
      const f = st.departments.find((d) => d.id === t.departmentId)?.facultyId;
      if (f) inc(c.t, f);
    });
    students.forEach((s) => [s.facultyId, s.departmentId, s.directionId, s.groupId].forEach((k) => inc(c.s, k)));
    return c;
  }, [st, teachers, students]);

  const toggle = (id: string) => setOpen((o) => {
    const n = new Set(o);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });

  const nameOf = (s: Sel | null) => {
    if (!s || !st) return '';
    const list = { faculty: st.faculties, department: st.departments, direction: st.directions, group: st.groups }[s.kind] as { id: string; name: string }[];
    return list.find((x) => x.id === s.id)?.name ?? '';
  };

  const openForm = (kind: UnitKind, id?: string, parent = '') => {
    setFormErr({});
    if (id && st) {
      const item = ({ faculty: st.faculties, department: st.departments, direction: st.directions, group: st.groups }[kind] as unknown as Record<string, unknown>[]).find((x) => x.id === id)!;
      setForm({
        kind, id, name: String(item.name),
        parent: String(item.facultyId ?? item.departmentId ?? item.directionId ?? ''),
        course: String(item.course ?? '1'), studyForm: (item.studyForm as StudyForm) ?? 'kunduzgi',
      });
    } else setForm({ kind, name: '', parent, course: '1', studyForm: 'kunduzgi' });
  };

  const saveForm = async () => {
    if (!form) return;
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Bu maydon to'ldirilishi shart";
    if (form.kind !== 'faculty' && !form.parent) e.parent = "Bu maydon to'ldirilishi shart";
    setFormErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const data: Record<string, unknown> = { id: form.id, name: form.name.trim() };
    if (form.kind === 'department') data.facultyId = form.parent;
    if (form.kind === 'direction') data.departmentId = form.parent;
    if (form.kind === 'group') Object.assign(data, { directionId: form.parent, course: Number(form.course) as Course, studyForm: form.studyForm });
    try {
      await api.saveUnit(form.kind, data);
      await reloadStructure();
      toast.success('Saqlandi');
      if (form.parent) setOpen((o) => new Set([...o, form.parent]));
      setForm(null);
    } catch (x) {
      toast.error((x as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const askDelete = (s: Sel) => {
    const has = (counts.s[s.id] ?? 0) + (counts.t[s.id] ?? 0) > 0;
    if (has) setBlocked(true);
    else setDel(s);
  };
  const doDelete = async () => {
    if (!del) return;
    setBusy(true);
    try {
      await api.deleteUnit(del.kind, del.id);
      await reloadStructure();
      toast.success("O'chirildi");
      if (sel?.id === del.id) setSel(null);
      setDel(null);
    } catch (x) {
      setDel(null);
      setBlocked(true);
      void x;
    } finally {
      setBusy(false);
    }
  };

  const Row = ({ kind, id, name, depth, hasChildren, meta }: { kind: UnitKind; id: string; name: string; depth: number; hasChildren: boolean; meta: string }) => {
    const active = sel?.id === id;
    return (
      <div
        className={`group flex items-center gap-1.5 rounded-ctl py-1.5 pr-1.5 transition-colors ${active ? 'bg-primary-soft' : 'hover:bg-surface-2'}`}
        style={{ paddingLeft: 6 + depth * 18 }}
      >
        <button
          type="button"
          onClick={() => hasChildren && toggle(id)}
          aria-label={open.has(id) ? 'Yig\'ish' : 'Yoyish'}
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted hover:text-text ${hasChildren ? '' : 'invisible'}`}
        >
          <ChevronRight size={15} className={`transition-transform ${open.has(id) ? 'rotate-90' : ''}`} />
        </button>
        <button type="button" onClick={() => setSel({ kind, id })} className="focus-ring flex min-w-0 flex-1 items-center gap-2 rounded-md text-left">
          <span className={active ? 'text-primary-ink' : 'text-muted'}>{KIND_ICON[kind]}</span>
          <span className={`truncate text-sm ${active ? 'font-semibold text-primary-ink' : 'font-medium text-text'}`}>{name}</span>
          <span className="ml-auto hidden shrink-0 text-[11px] text-muted sm:inline">{meta}</span>
        </button>
        {manage && (
          <span className="flex shrink-0 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <IconButton size="sm" label="Tahrirlash" onClick={() => openForm(kind, id)}><Pencil size={14} /></IconButton>
            <IconButton size="sm" tone="danger" label="O'chirish" onClick={() => askDelete({ kind, id })}><Trash2 size={14} /></IconButton>
          </span>
        )}
      </div>
    );
  };

  const meta = (id: string, withT: boolean) => [withT && counts.t[id] ? `${counts.t[id]} o'qituvchi` : '', counts.s[id] ? `${counts.s[id]} talaba` : ''].filter(Boolean).join(' · ');

  const parentOptions = (kind: UnitKind) =>
    !st ? [] : kind === 'department' ? st.faculties : kind === 'direction' ? st.departments : kind === 'group' ? st.directions : [];

  // O'ng panel — tanlangan bo'linma tafsilotlari
  const details = () => {
    if (!sel || !st) return <EmptyState text="Tafsilotlarni ko'rish uchun chap tomondagi bo'linmani tanlang" icon={<Building2 size={20} />} />;
    const name = nameOf(sel);
    const chain: string[] = [];
    let children: { kind: UnitKind; id: string; name: string; meta: string }[] = [];
    let list: ReactNode = null;
    if (sel.kind === 'faculty') {
      children = st.departments.filter((d) => d.facultyId === sel.id).map((d) => ({ kind: 'department', id: d.id, name: d.name, meta: meta(d.id, true) }));
    } else if (sel.kind === 'department') {
      const d = st.departments.find((x) => x.id === sel.id);
      chain.push(st.faculties.find((f) => f.id === d?.facultyId)?.name ?? '');
      children = st.directions.filter((x) => x.departmentId === sel.id).map((x) => ({ kind: 'direction', id: x.id, name: x.name, meta: meta(x.id, false) }));
      const ts = teachers.filter((t) => t.departmentId === sel.id);
      list = (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-semibold text-text">O'qituvchilar ({ts.length})</h3>
          <ul className="divide-y divide-border">
            {ts.map((t) => (
              <li key={t.id}>
                <button onClick={() => nav(`/oqituvchilar/${t.id}`)} className="focus-ring -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-ctl px-2 py-2 text-left hover:bg-surface-2">
                  <Avatar name={fullName(t)} photo={t.photo} size={32} />
                  <span className="flex-1 truncate text-sm font-medium text-text">{fullName(t)}</span>
                  <span className="hidden text-xs text-muted sm:inline">{t.position}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      );
    } else if (sel.kind === 'direction') {
      const d = st.directions.find((x) => x.id === sel.id);
      const dep = st.departments.find((x) => x.id === d?.departmentId);
      chain.push(st.faculties.find((f) => f.id === dep?.facultyId)?.name ?? '', dep?.name ?? '');
      children = st.groups.filter((g) => g.directionId === sel.id).map((g) => ({ kind: 'group', id: g.id, name: g.name, meta: `${COURSE_LABELS[g.course]} · ${meta(g.id, false) || '0 talaba'}` }));
    } else {
      const g = st.groups.find((x) => x.id === sel.id);
      const d = st.directions.find((x) => x.id === g?.directionId);
      const dep = st.departments.find((x) => x.id === d?.departmentId);
      chain.push(st.faculties.find((f) => f.id === dep?.facultyId)?.name ?? '', dep?.name ?? '', d?.name ?? '');
      const ss = students.filter((s) => s.groupId === sel.id);
      list = (
        <div className="mt-5">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {g && <Pill tone="info">{COURSE_LABELS[g.course]}</Pill>}
            {g && <Pill tone="neutral">{STUDY_FORM_LABELS[g.studyForm]}</Pill>}
          </div>
          <h3 className="mb-2 text-sm font-semibold text-text">Talabalar ({ss.length})</h3>
          <ul className="divide-y divide-border">
            {ss.map((s) => (
              <li key={s.id}>
                <button onClick={() => nav(`/talabalar/${s.id}`)} className="focus-ring -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-ctl px-2 py-2 text-left hover:bg-surface-2">
                  <Avatar name={fullName(s)} photo={s.photo} size={32} />
                  <span className="flex-1 truncate text-sm font-medium text-text">{fullName(s)}</span>
                  <span className="text-xs text-muted tabular">{s.studentId}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    const nextKind: UnitKind | null = sel.kind === 'faculty' ? 'department' : sel.kind === 'department' ? 'direction' : sel.kind === 'direction' ? 'group' : null;
    return (
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Pill tone="primary" icon={KIND_ICON[sel.kind]}>{KIND_LABEL[sel.kind]}</Pill>
            <h2 className="mt-2 text-xl font-bold text-text">{name}</h2>
            {chain.filter(Boolean).length > 0 && <p className="mt-1 text-sm text-muted">{chain.filter(Boolean).join(' → ')}</p>}
          </div>
          {manage && (
            <div className="flex gap-1">
              <IconButton label="Tahrirlash" onClick={() => openForm(sel.kind, sel.id)}><Pencil size={16} /></IconButton>
              <IconButton label="O'chirish" tone="danger" onClick={() => askDelete(sel)}><Trash2 size={16} /></IconButton>
            </div>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {sel.kind !== 'direction' && sel.kind !== 'group' && (
            <div className="rounded-ctl bg-surface-2 p-3">
              <div className="flex items-center gap-2 text-xs text-muted"><Users size={14} /> O'qituvchilar</div>
              <div className="mt-1 text-xl font-bold text-text tabular">{counts.t[sel.id] ?? 0}</div>
            </div>
          )}
          <div className="rounded-ctl bg-surface-2 p-3">
            <div className="flex items-center gap-2 text-xs text-muted"><GraduationCap size={14} /> Talabalar</div>
            <div className="mt-1 text-xl font-bold text-text tabular">{counts.s[sel.id] ?? 0}</div>
          </div>
        </div>
        {nextKind && (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text">{KIND_LABEL[nextKind]}lar ({children.length})</h3>
              {manage && (
                <Button size="sm" variant="soft" icon={<Plus size={14} />} onClick={() => openForm(nextKind, undefined, sel.id)}>
                  {KIND_LABEL[nextKind]} qo'shish
                </Button>
              )}
            </div>
            {children.length ? (
              <ul className="space-y-1.5">
                {children.map((c) => (
                  <li key={c.id}>
                    <button onClick={() => setSel({ kind: c.kind, id: c.id })} className="focus-ring flex w-full items-center gap-2 rounded-ctl border border-border px-3 py-2.5 text-left hover:bg-surface-2">
                      <span className="text-muted">{KIND_ICON[c.kind]}</span>
                      <span className="flex-1 truncate text-sm font-medium text-text">{c.name}</span>
                      <span className="text-xs text-muted">{c.meta}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-ctl bg-surface-2 px-3 py-4 text-center text-sm text-muted">Hozircha mavjud emas</p>
            )}
          </div>
        )}
        {list}
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title="Fakultet va kafedralar"
        subtitle={st ? `${st.faculties.length} fakultet · ${st.departments.length} kafedra · ${st.directions.length} yo'nalish · ${st.groups.length} guruh` : undefined}
        actions={
          manage && (
            <>
              {(['faculty', 'department', 'direction', 'group'] as UnitKind[]).map((k, i) => (
                <Button key={k} variant={i === 0 ? 'primary' : 'outline'} icon={<Plus size={16} />} onClick={() => openForm(k)}>
                  {KIND_LABEL[k]} qo'shish
                </Button>
              ))}
            </>
          )
        }
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(320px,440px)_1fr]">
        <Card className="p-3">
          {!st ? (
            <div className="space-y-2 p-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
          ) : (
            <div role="tree" aria-label="Tuzilma">
              {st.faculties.map((f) => {
                const deps = st.departments.filter((d) => d.facultyId === f.id);
                return (
                  <div key={f.id}>
                    <Row kind="faculty" id={f.id} name={f.name} depth={0} hasChildren={deps.length > 0} meta={meta(f.id, true)} />
                    {open.has(f.id) &&
                      deps.map((d) => {
                        const dirs = st.directions.filter((x) => x.departmentId === d.id);
                        return (
                          <div key={d.id}>
                            <Row kind="department" id={d.id} name={d.name} depth={1} hasChildren={dirs.length > 0} meta={meta(d.id, true)} />
                            {open.has(d.id) &&
                              dirs.map((dr) => {
                                const gs = st.groups.filter((g) => g.directionId === dr.id);
                                return (
                                  <div key={dr.id}>
                                    <Row kind="direction" id={dr.id} name={dr.name} depth={2} hasChildren={gs.length > 0} meta={meta(dr.id, false)} />
                                    {open.has(dr.id) && gs.map((g) => <Row key={g.id} kind="group" id={g.id} name={g.name} depth={3} hasChildren={false} meta={meta(g.id, false)} />)}
                                  </div>
                                );
                              })}
                          </div>
                        );
                      })}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        <Card className="p-5 sm:p-6">{details()}</Card>
      </div>

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form ? `${KIND_LABEL[form.kind]} ${form.id ? 'tahrirlash' : "qo'shish"}` : ''}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setForm(null)}>Bekor qilish</Button>
            <Button loading={busy} onClick={saveForm}>Saqlash</Button>
          </>
        }
      >
        {form && (
          <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); void saveForm(); }}>
            <Field label="Nomi" required error={formErr.name} htmlFor="u-name">
              <Input id="u-name" value={form.name} invalid={!!formErr.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setFormErr({ ...formErr, name: '' }); }} placeholder={form.kind === 'group' ? 'Masalan: IQ-26-02' : 'Nomini kiriting'} />
            </Field>
            {form.kind !== 'faculty' && (
              <Field label={PARENT_LABEL[form.kind]} required error={formErr.parent} htmlFor="u-parent">
                <Select id="u-parent" value={form.parent} invalid={!!formErr.parent} onChange={(e) => { setForm({ ...form, parent: e.target.value }); setFormErr({ ...formErr, parent: '' }); }} placeholder="Tanlang" options={parentOptions(form.kind).map((p) => ({ value: p.id, label: p.name }))} />
              </Field>
            )}
            {form.kind === 'group' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Kurs" required htmlFor="u-course">
                  <Select id="u-course" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} options={COURSE_OPTIONS} />
                </Field>
                <Field label="Ta'lim shakli" htmlFor="u-form">
                  <Select id="u-form" value={form.studyForm} onChange={(e) => setForm({ ...form, studyForm: e.target.value as StudyForm })} options={Object.entries(STUDY_FORM_LABELS).map(([value, label]) => ({ value, label }))} />
                </Field>
              </div>
            )}
            <button type="submit" className="hidden" />
          </form>
        )}
      </Modal>

      <ConfirmModal open={!!del} onClose={() => setDel(null)} onConfirm={doDelete} loading={busy} danger confirmText="O'chirish" title="Rostdan ham o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi." text={nameOf(del)} />
      <Modal open={blocked} onClose={() => setBlocked(false)} title="O'chirib bo'lmaydi" size="sm" footer={<Button onClick={() => setBlocked(false)}>Tushunarli</Button>}>
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-warning-soft text-warning-ink"><AlertTriangle size={20} /></span>
          <p className="text-sm text-text">Bu bo'linmada xodimlar yoki talabalar mavjud. Avval ularni boshqa bo'linmaga o'tkazing.</p>
        </div>
      </Modal>
    </div>
  );
}
