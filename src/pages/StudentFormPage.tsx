import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Plus, ScanLine, Trash2, User, Users } from 'lucide-react';
import * as api from '@/services/api';
import type { Course, Parent, Student, StudyForm } from '@/types';
import { useToast } from '@/context/ToastContext';
import { COURSE_OPTIONS, STUDY_FORM_LABELS, isValidPhone } from '@/utils/format';
import { todayISO } from '@/utils/date';
import { useDocumentTitle, useStructure } from '@/utils/hooks';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { DigitsInput, Field, Input, PhoneInput, RadioGroup, Select } from '@/components/ui/Form';
import { ConfirmModal } from '@/components/ui/Modal';
import { ErrorState, Skeleton } from '@/components/ui/Misc';
import { AddressFields, FormSection, PhotoUpload, StickyBar, scrollToFirstError } from '@/components/FormParts';

type Form = Omit<Student, 'id' | 'gender' | 'course' | 'studyForm'> & { gender: Student['gender'] | ''; course: string; studyForm: StudyForm | '' };
const EMPTY_PARENT: Parent = { fullName: '', relation: 'Otasi', phone: '', phone2: '' };
const EMPTY: Form = {
  photo: null, lastName: '', firstName: '', middleName: '', birthDate: '', gender: '', jshshir: '', phone: '', region: 'Surxondaryo viloyati', district: '', address: '',
  parents: [{ ...EMPTY_PARENT }], studentId: '', facultyId: '', departmentId: '', directionId: '', course: '', groupId: '', studyForm: '', admissionYear: String(new Date().getFullYear()),
  turnstileId: '', active: true,
};
const REQ = "Bu maydon to'ldirilishi shart";
const ORDER = ['lastName', 'firstName', 'middleName', 'birthDate', 'gender', 'jshshir', 'phone', 'p0.fullName', 'p0.phone', 'p0.phone2', 'p1.fullName', 'p1.phone', 'p2.fullName', 'p2.phone', 'studentId', 'facultyId', 'departmentId', 'directionId', 'course', 'groupId', 'studyForm', 'admissionYear', 'turnstileId'];

export default function StudentFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  useDocumentTitle(isEdit ? "Talaba ma'lumotlarini tahrirlash" : "Yangi talaba qo'shish");
  const nav = useNavigate();
  const toast = useToast();
  const st = useStructure();
  const [f, setF] = useState<Form>(EMPTY);
  const [initial, setInitial] = useState<Form>(EMPTY);
  const [err, setErr] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(isEdit);
  const [loadErr, setLoadErr] = useState(false);
  const [busy, setBusy] = useState<'save' | 'more' | null>(null);
  const [leave, setLeave] = useState(false);

  const load = () => {
    if (!id) return;
    setLoading(true);
    setLoadErr(false);
    api
      .getStudent(id)
      .then((s) => {
        if (!s) return nav('/talabalar', { replace: true });
        const v: Form = { ...s, course: String(s.course) };
        setF(v);
        setInitial(v);
      })
      .catch(() => setLoadErr(true))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [id]);

  const dirty = useMemo(() => JSON.stringify(f) !== JSON.stringify(initial), [f, initial]);
  const clearErr = (k: string) => err[k] && setErr((e) => ({ ...e, [k]: '' }));
  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    clearErr(k as string);
  };
  const setParent = (i: number, k: keyof Parent, v: string) => {
    setF((x) => ({ ...x, parents: x.parents.map((p, j) => (j === i ? { ...p, [k]: v } : p)) }));
    clearErr(`p${i}.${k}`);
  };

  const deps = (st?.departments ?? []).filter((d) => d.facultyId === f.facultyId);
  const dirs = (st?.directions ?? []).filter((d) => d.departmentId === f.departmentId);
  const groups = (st?.groups ?? []).filter((g) => g.directionId === f.directionId && (!f.course || String(g.course) === f.course));

  const validate = () => {
    const e: Record<string, string> = {};
    (['lastName', 'firstName', 'middleName', 'birthDate', 'gender', 'jshshir', 'phone', 'studentId', 'facultyId', 'departmentId', 'directionId', 'course', 'groupId', 'studyForm', 'admissionYear', 'turnstileId'] as const).forEach((k) => {
      if (!String(f[k] ?? '').trim()) e[k] = REQ;
    });
    if (f.phone && !isValidPhone(f.phone)) e.phone = "Telefon raqami noto'g'ri kiritilgan";
    if (f.jshshir && f.jshshir.length !== 14) e.jshshir = "JSHSHIR 14 ta raqamdan iborat bo'lishi kerak";
    if (f.admissionYear && !/^\d{4}$/.test(f.admissionYear)) e.admissionYear = "Yil noto'g'ri kiritilgan";
    f.parents.forEach((p, i) => {
      if (!p.fullName.trim()) e[`p${i}.fullName`] = REQ;
      if (!p.phone) e[`p${i}.phone`] = REQ;
      else if (!isValidPhone(p.phone)) e[`p${i}.phone`] = "Telefon raqami noto'g'ri kiritilgan";
      if (p.phone2 && !isValidPhone(p.phone2)) e[`p${i}.phone2`] = "Telefon raqami noto'g'ri kiritilgan";
    });
    return e;
  };

  const save = async (more: boolean) => {
    const e = validate();
    setErr(e);
    if (Object.values(e).some(Boolean)) {
      scrollToFirstError(e, ORDER);
      return;
    }
    setBusy(more ? 'more' : 'save');
    const payload = { ...f, gender: f.gender as Student['gender'], course: Number(f.course) as Course, studyForm: f.studyForm as StudyForm };
    try {
      if (isEdit) await api.updateStudent(id!, payload);
      else await api.addStudent(payload);
      toast.success(isEdit ? "Ma'lumotlar saqlandi" : "Talaba muvaffaqiyatli qo'shildi");
      if (more) {
        setF(EMPTY);
        setInitial(EMPTY);
        setErr({});
        if (isEdit) nav('/talabalar/qoshish');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else nav('/talabalar');
    } catch (x) {
      const ae = x as api.ApiError;
      if (ae.field) {
        const ne = { [ae.field]: ae.message };
        setErr(ne);
        scrollToFirstError(ne, ORDER);
      } else toast.error(ae.message);
    } finally {
      setBusy(null);
    }
  };

  if (loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-64 w-full !rounded-card" />
        <Skeleton className="h-48 w-full !rounded-card" />
      </div>
    );
  if (loadErr) return <div className="card"><ErrorState onRetry={load} /></div>;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save(false);
      }}
    >
      <Link to="/talabalar" onClick={(e) => { if (dirty) { e.preventDefault(); setLeave(true); } }} className="focus-ring mb-3 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted hover:text-primary-ink">
        <ArrowLeft size={16} /> Talabalar ro'yxatiga qaytish
      </Link>
      <h1 className="mb-5 text-2xl font-bold tracking-tight text-text">{isEdit ? "Talaba ma'lumotlarini tahrirlash" : "Yangi talaba qo'shish"}</h1>

      <div className="space-y-5">
        <FormSection title="Shaxsiy ma'lumotlar" icon={<User size={17} />}>
          <PhotoUpload value={f.photo} onChange={(v) => set('photo', v)} />
          <Field label="Familiya" required error={err.lastName} htmlFor="lastName" name="lastName">
            <Input id="lastName" value={f.lastName} invalid={!!err.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Familiyani kiriting" />
          </Field>
          <Field label="Ism" required error={err.firstName} htmlFor="firstName" name="firstName">
            <Input id="firstName" value={f.firstName} invalid={!!err.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="Ismni kiriting" />
          </Field>
          <Field label="Otasining ismi" required error={err.middleName} htmlFor="middleName" name="middleName">
            <Input id="middleName" value={f.middleName} invalid={!!err.middleName} onChange={(e) => set('middleName', e.target.value)} placeholder="Masalan: Olim o'g'li" />
          </Field>
          <Field label="Tug'ilgan sana" required error={err.birthDate} htmlFor="birthDate" name="birthDate">
            <DatePicker id="birthDate" value={f.birthDate} invalid={!!err.birthDate} onChange={(v) => set('birthDate', v)} max={todayISO()} />
          </Field>
          <Field label="Jinsi" required error={err.gender} name="gender">
            <RadioGroup value={f.gender} invalid={!!err.gender} onChange={(v) => set('gender', v)} options={[{ value: 'erkak', label: 'Erkak' }, { value: 'ayol', label: 'Ayol' }]} />
          </Field>
          <Field label="JSHSHIR" required error={err.jshshir} hint="Jismoniy shaxsning shaxsiy identifikatsiya raqami" htmlFor="jshshir" name="jshshir">
            <DigitsInput id="jshshir" length={14} value={f.jshshir} invalid={!!err.jshshir} onChange={(v) => set('jshshir', v)} placeholder="14 ta raqam" />
          </Field>
          <Field label="Telefon raqami" required error={err.phone} htmlFor="phone" name="phone">
            <PhoneInput id="phone" value={f.phone} invalid={!!err.phone} onChange={(v) => set('phone', v)} />
          </Field>
          <div className="hidden lg:block" />
          <AddressFields v={f} set={(k, v) => set(k, v)} err={err} required={false} />
        </FormSection>

        <FormSection title="Ota-ona ma'lumotlari" icon={<Users size={17} />} cols={2}>
          {f.parents.map((p, i) => (
            <div key={i} className="grid gap-4 rounded-ctl border border-border p-4 sm:col-span-2 sm:grid-cols-2">
              <div className="flex items-center justify-between sm:col-span-2">
                <span className="text-sm font-semibold text-muted">{i + 1}-ota-ona</span>
                {i > 0 && (
                  <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} className="!text-danger-ink hover:!bg-danger-soft" onClick={() => setF((x) => ({ ...x, parents: x.parents.filter((_, j) => j !== i) }))}>
                    O'chirish
                  </Button>
                )}
              </div>
              <Field label="Ota-onasining F.I.Sh" required error={err[`p${i}.fullName`]} htmlFor={`p${i}-name`} name={`p${i}.fullName`}>
                <Input id={`p${i}-name`} value={p.fullName} invalid={!!err[`p${i}.fullName`]} onChange={(e) => setParent(i, 'fullName', e.target.value)} placeholder="Familiya Ism Otasining ismi" />
              </Field>
              <Field label="Kimligi" htmlFor={`p${i}-rel`}>
                <Select id={`p${i}-rel`} value={p.relation} onChange={(e) => setParent(i, 'relation', e.target.value)} options={['Otasi', 'Onasi', 'Vasiy'].map((r) => ({ value: r, label: r }))} />
              </Field>
              <Field label="Ota-onasining telefon raqami" required error={err[`p${i}.phone`]} htmlFor={`p${i}-phone`} name={`p${i}.phone`}>
                <PhoneInput id={`p${i}-phone`} value={p.phone} invalid={!!err[`p${i}.phone`]} onChange={(v) => setParent(i, 'phone', v)} />
              </Field>
              <Field label="Ikkinchi ota-ona telefon raqami" error={err[`p${i}.phone2`]} htmlFor={`p${i}-phone2`} name={`p${i}.phone2`}>
                <PhoneInput id={`p${i}-phone2`} value={p.phone2} invalid={!!err[`p${i}.phone2`]} onChange={(v) => setParent(i, 'phone2', v)} />
              </Field>
            </div>
          ))}
          {f.parents.length < 3 && (
            <div className="sm:col-span-2">
              <button type="button" onClick={() => setF((x) => ({ ...x, parents: [...x.parents, { ...EMPTY_PARENT, relation: 'Onasi' }] }))} className="focus-ring inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-primary-ink hover:underline">
                <Plus size={16} /> Yana qo'shish
              </button>
            </div>
          )}
        </FormSection>

        <FormSection title="O'qish ma'lumotlari" icon={<BookOpen size={17} />}>
          <Field label="Talaba ID" required error={err.studentId} htmlFor="studentId" name="studentId">
            <DigitsInput id="studentId" length={10} value={f.studentId} invalid={!!err.studentId} onChange={(v) => set('studentId', v)} placeholder="Masalan: 2210345" />
          </Field>
          <Field label="Fakultet" required error={err.facultyId} htmlFor="facultyId" name="facultyId">
            <Select id="facultyId" value={f.facultyId} invalid={!!err.facultyId} onChange={(e) => setF((x) => ({ ...x, facultyId: e.target.value, departmentId: '', directionId: '', groupId: '' }))} placeholder="Fakultetni tanlang" options={(st?.faculties ?? []).map((d) => ({ value: d.id, label: d.name }))} />
          </Field>
          <Field label="Kafedra" required error={err.departmentId} htmlFor="departmentId" name="departmentId">
            <Select id="departmentId" disabled={!f.facultyId} value={f.departmentId} invalid={!!err.departmentId} onChange={(e) => setF((x) => ({ ...x, departmentId: e.target.value, directionId: '', groupId: '' }))} placeholder={f.facultyId ? 'Kafedrani tanlang' : 'Avval fakultetni tanlang'} options={deps.map((d) => ({ value: d.id, label: d.name }))} />
          </Field>
          <Field label="Yo'nalish (mutaxassislik)" required error={err.directionId} htmlFor="directionId" name="directionId">
            <Select id="directionId" disabled={!f.departmentId} value={f.directionId} invalid={!!err.directionId} onChange={(e) => setF((x) => ({ ...x, directionId: e.target.value, groupId: '' }))} placeholder={f.departmentId ? "Yo'nalishni tanlang" : 'Avval kafedrani tanlang'} options={dirs.map((d) => ({ value: d.id, label: d.name }))} />
          </Field>
          <Field label="Kurs" required error={err.course} htmlFor="course" name="course">
            <Select id="course" value={f.course} invalid={!!err.course} onChange={(e) => setF((x) => ({ ...x, course: e.target.value, groupId: '' }))} placeholder="Kursni tanlang" options={COURSE_OPTIONS} />
          </Field>
          <Field label="Guruh" required error={err.groupId} htmlFor="groupId" name="groupId">
            <Select
              id="groupId"
              disabled={!f.directionId}
              value={f.groupId}
              invalid={!!err.groupId}
              onChange={(e) => {
                const g = st?.groups.find((x) => x.id === e.target.value);
                setF((x) => ({ ...x, groupId: e.target.value, course: g ? String(g.course) : x.course, studyForm: g?.studyForm ?? x.studyForm }));
                clearErr('groupId');
              }}
              placeholder={f.directionId ? (groups.length ? 'Guruhni tanlang' : 'Mos guruh topilmadi') : "Avval yo'nalishni tanlang"}
              options={groups.map((g) => ({ value: g.id, label: g.name }))}
            />
          </Field>
          <Field label="Ta'lim shakli" required error={err.studyForm} name="studyForm">
            <RadioGroup value={f.studyForm} invalid={!!err.studyForm} onChange={(v) => set('studyForm', v)} options={(Object.keys(STUDY_FORM_LABELS) as StudyForm[]).map((k) => ({ value: k, label: STUDY_FORM_LABELS[k] }))} />
          </Field>
          <Field label="Qabul qilingan yil" required error={err.admissionYear} htmlFor="admissionYear" name="admissionYear">
            <DigitsInput id="admissionYear" length={4} value={f.admissionYear} invalid={!!err.admissionYear} onChange={(v) => set('admissionYear', v)} placeholder="Masalan: 2026" />
          </Field>
        </FormSection>

        <FormSection title="Turniket" icon={<ScanLine size={17} />}>
          <Field label="Turniket ID" required error={err.turnstileId} hint="Turniketdagi raqam. Davomat aynan shu raqam orqali bog'lanadi." htmlFor="turnstileId" name="turnstileId">
            <Input id="turnstileId" className="tabular" value={f.turnstileId} invalid={!!err.turnstileId} onChange={(e) => set('turnstileId', e.target.value.trim())} placeholder="Masalan: 20251" />
          </Field>
        </FormSection>
      </div>

      <StickyBar>
        <Button variant="outline" onClick={() => (dirty ? setLeave(true) : nav('/talabalar'))}>
          Bekor qilish
        </Button>
        <Button variant="soft" loading={busy === 'more'} disabled={!!busy} onClick={() => void save(true)}>
          Saqlash va yangisini qo'shish
        </Button>
        <Button type="submit" loading={busy === 'save'} disabled={!!busy}>
          Saqlash
        </Button>
      </StickyBar>

      <ConfirmModal open={leave} onClose={() => setLeave(false)} onConfirm={() => nav('/talabalar')} title="Kiritilgan ma'lumotlar saqlanmaydi. Chiqishni xohlaysizmi?" confirmText="Chiqish" danger />
    </form>
  );
}
