import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Briefcase, IdCard, MapPin, ScanLine, User } from 'lucide-react';
import * as api from '@/services/api';
import type { Teacher } from '@/types';
import { useToast } from '@/context/ToastContext';
import { DEGREES, POSITIONS, RATES, isValidPassport, isValidPhone } from '@/utils/format';
import { todayISO } from '@/utils/date';
import { useDocumentTitle, useStructure } from '@/utils/hooks';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { DigitsInput, Field, Input, PassportInput, PhoneInput, RadioGroup, Select, Toggle } from '@/components/ui/Form';
import { ConfirmModal } from '@/components/ui/Modal';
import { ErrorState, Skeleton } from '@/components/ui/Misc';
import { AddressFields, FormSection, PhotoUpload, StickyBar, scrollToFirstError } from '@/components/FormParts';

type Form = Omit<Teacher, 'id' | 'gender'> & { gender: Teacher['gender'] | ''; positionOther: string };
const EMPTY: Form = {
  photo: null, lastName: '', firstName: '', middleName: '', birthDate: '', gender: '', phone: '', phone2: '', passport: '', jshshir: '',
  passportIssued: '', passportIssuedBy: '', passportExpiry: '', region: 'Surxondaryo viloyati', district: '', address: '', departmentId: '',
  position: '', positionOther: '', degree: "Yo'q", hiredDate: '', rate: '1,0', active: true, turnstileId: '',
};
const ORDER = ['lastName', 'firstName', 'middleName', 'birthDate', 'gender', 'phone', 'phone2', 'passport', 'jshshir', 'passportIssued', 'passportIssuedBy', 'region', 'district', 'address', 'departmentId', 'position', 'positionOther', 'hiredDate', 'rate', 'turnstileId'];
const REQ = "Bu maydon to'ldirilishi shart";

export default function TeacherFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  useDocumentTitle(isEdit ? "O'qituvchi ma'lumotlarini tahrirlash" : "Yangi o'qituvchi qo'shish");
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
      .getTeacher(id)
      .then((t) => {
        if (!t) return nav('/oqituvchilar', { replace: true });
        const known = POSITIONS.includes(t.position);
        const v: Form = { ...t, position: known ? t.position : 'Boshqa', positionOther: known ? '' : t.position };
        setF(v);
        setInitial(v);
      })
      .catch(() => setLoadErr(true))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [id]);

  const dirty = useMemo(() => JSON.stringify(f) !== JSON.stringify(initial), [f, initial]);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    if (err[k as string]) setErr((e) => ({ ...e, [k]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const req: (keyof Form)[] = ['lastName', 'firstName', 'middleName', 'birthDate', 'gender', 'phone', 'passport', 'jshshir', 'passportIssued', 'passportIssuedBy', 'region', 'district', 'address', 'departmentId', 'position', 'hiredDate', 'rate', 'turnstileId'];
    req.forEach((k) => {
      if (!String(f[k] ?? '').trim()) e[k] = REQ;
    });
    if (f.phone && !isValidPhone(f.phone)) e.phone = "Telefon raqami noto'g'ri kiritilgan";
    if (f.phone2 && !isValidPhone(f.phone2)) e.phone2 = "Telefon raqami noto'g'ri kiritilgan";
    if (f.passport && !isValidPassport(f.passport)) e.passport = "Pasport seriyasi va raqami noto'g'ri (masalan: AA1234567)";
    if (f.jshshir && f.jshshir.length !== 14) e.jshshir = "JSHSHIR 14 ta raqamdan iborat bo'lishi kerak";
    if (f.position === 'Boshqa' && !f.positionOther.trim()) e.positionOther = REQ;
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
    const { positionOther, ...rest } = f;
    const payload = { ...rest, gender: f.gender as Teacher['gender'], position: f.position === 'Boshqa' ? positionOther.trim() : f.position };
    try {
      if (isEdit) await api.updateTeacher(id!, payload);
      else await api.addTeacher(payload);
      toast.success(isEdit ? "Ma'lumotlar saqlandi" : "O'qituvchi muvaffaqiyatli qo'shildi");
      if (more) {
        setF(EMPTY);
        setInitial(EMPTY);
        setErr({});
        if (isEdit) nav('/oqituvchilar/qoshish');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else nav('/oqituvchilar');
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

  const cancel = () => (dirty ? setLeave(true) : nav('/oqituvchilar'));

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
      <Link to="/oqituvchilar" onClick={(e) => { if (dirty) { e.preventDefault(); setLeave(true); } }} className="focus-ring mb-3 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted hover:text-primary-ink">
        <ArrowLeft size={16} /> O'qituvchilar ro'yxatiga qaytish
      </Link>
      <h1 className="mb-5 text-2xl font-bold tracking-tight text-text">{isEdit ? "O'qituvchi ma'lumotlarini tahrirlash" : "Yangi o'qituvchi qo'shish"}</h1>

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
            <Input id="middleName" value={f.middleName} invalid={!!err.middleName} onChange={(e) => set('middleName', e.target.value)} placeholder="Otasining ismini kiriting" />
          </Field>
          <Field label="Tug'ilgan sana" required error={err.birthDate} htmlFor="birthDate" name="birthDate">
            <DatePicker id="birthDate" value={f.birthDate} invalid={!!err.birthDate} onChange={(v) => set('birthDate', v)} max={todayISO()} />
          </Field>
          <Field label="Jinsi" required error={err.gender} name="gender">
            <RadioGroup value={f.gender} invalid={!!err.gender} onChange={(v) => set('gender', v)} options={[{ value: 'erkak', label: 'Erkak' }, { value: 'ayol', label: 'Ayol' }]} />
          </Field>
          <div className="hidden lg:block" />
          <Field label="Telefon raqami" required error={err.phone} htmlFor="phone" name="phone">
            <PhoneInput id="phone" value={f.phone} invalid={!!err.phone} onChange={(v) => set('phone', v)} />
          </Field>
          <Field label="Qo'shimcha telefon raqami" error={err.phone2} htmlFor="phone2" name="phone2">
            <PhoneInput id="phone2" value={f.phone2} invalid={!!err.phone2} onChange={(v) => set('phone2', v)} />
          </Field>
        </FormSection>

        <FormSection title="Pasport ma'lumotlari" icon={<IdCard size={17} />}>
          <Field label="Pasport seriyasi va raqami" required error={err.passport} htmlFor="passport" name="passport">
            <PassportInput id="passport" value={f.passport} invalid={!!err.passport} onChange={(v) => set('passport', v)} />
          </Field>
          <Field label="JSHSHIR" required error={err.jshshir} hint="Jismoniy shaxsning shaxsiy identifikatsiya raqami" htmlFor="jshshir" name="jshshir">
            <DigitsInput id="jshshir" length={14} value={f.jshshir} invalid={!!err.jshshir} onChange={(v) => set('jshshir', v)} placeholder="14 ta raqam" />
          </Field>
          <Field label="Berilgan sana" required error={err.passportIssued} htmlFor="passportIssued" name="passportIssued">
            <DatePicker id="passportIssued" value={f.passportIssued} invalid={!!err.passportIssued} onChange={(v) => set('passportIssued', v)} max={todayISO()} />
          </Field>
          <Field label="Kim tomonidan berilgan" required error={err.passportIssuedBy} htmlFor="passportIssuedBy" name="passportIssuedBy">
            <Input id="passportIssuedBy" value={f.passportIssuedBy} invalid={!!err.passportIssuedBy} onChange={(e) => set('passportIssuedBy', e.target.value)} placeholder="Masalan: Termiz shahar IIB" />
          </Field>
          <Field label="Amal qilish muddati" htmlFor="passportExpiry" name="passportExpiry">
            <DatePicker id="passportExpiry" value={f.passportExpiry} onChange={(v) => set('passportExpiry', v)} clearable />
          </Field>
        </FormSection>

        <FormSection title="Yashash manzili" icon={<MapPin size={17} />}>
          <AddressFields v={f} set={(k, v) => set(k, v)} err={err} />
        </FormSection>

        <FormSection title="Ish ma'lumotlari" icon={<Briefcase size={17} />}>
          <Field label="Kafedra" required error={err.departmentId} htmlFor="departmentId" name="departmentId">
            <Select id="departmentId" value={f.departmentId} invalid={!!err.departmentId} onChange={(e) => set('departmentId', e.target.value)} placeholder="Kafedrani tanlang" options={(st?.departments ?? []).map((d) => ({ value: d.id, label: d.name }))} />
          </Field>
          <Field label="Lavozimi" required error={err.position} htmlFor="position" name="position">
            <Select id="position" value={f.position} invalid={!!err.position} onChange={(e) => set('position', e.target.value)} placeholder="Lavozimni tanlang" options={[...POSITIONS, 'Boshqa'].map((p) => ({ value: p, label: p }))} />
          </Field>
          {f.position === 'Boshqa' && (
            <Field label="Lavozim nomi" required error={err.positionOther} htmlFor="positionOther" name="positionOther">
              <Input id="positionOther" value={f.positionOther} invalid={!!err.positionOther} onChange={(e) => set('positionOther', e.target.value)} placeholder="Lavozim nomini kiriting" />
            </Field>
          )}
          <Field label="Ilmiy daraja" htmlFor="degree" name="degree">
            <Select id="degree" value={f.degree} onChange={(e) => set('degree', e.target.value)} options={DEGREES.map((p) => ({ value: p, label: p }))} />
          </Field>
          <Field label="Ishga qabul qilingan sana" required error={err.hiredDate} htmlFor="hiredDate" name="hiredDate">
            <DatePicker id="hiredDate" value={f.hiredDate} invalid={!!err.hiredDate} onChange={(v) => set('hiredDate', v)} max={todayISO()} />
          </Field>
          <Field label="Stavka" required error={err.rate} htmlFor="rate" name="rate">
            <Select id="rate" value={f.rate} invalid={!!err.rate} onChange={(e) => set('rate', e.target.value)} options={RATES.map((p) => ({ value: p, label: p }))} />
          </Field>
          <Field label="Holati" name="active">
            <Toggle checked={f.active} onChange={(v) => set('active', v)} label="Faol" offLabel="Nofaol" />
          </Field>
        </FormSection>

        <FormSection title="Turniket" icon={<ScanLine size={17} />}>
          <Field label="Turniket ID" required error={err.turnstileId} hint="Turniketdagi xodim raqami. Davomat aynan shu raqam orqali bog'lanadi." htmlFor="turnstileId" name="turnstileId">
            <Input id="turnstileId" className="tabular" value={f.turnstileId} invalid={!!err.turnstileId} onChange={(e) => set('turnstileId', e.target.value.trim())} placeholder="Masalan: 1041" />
          </Field>
        </FormSection>
      </div>

      <StickyBar>
        <Button variant="outline" onClick={cancel}>
          Bekor qilish
        </Button>
        <Button variant="soft" loading={busy === 'more'} disabled={!!busy} onClick={() => void save(true)}>
          Saqlash va yangisini qo'shish
        </Button>
        <Button type="submit" loading={busy === 'save'} disabled={!!busy}>
          Saqlash
        </Button>
      </StickyBar>

      <ConfirmModal open={leave} onClose={() => setLeave(false)} onConfirm={() => nav('/oqituvchilar')} title="Kiritilgan ma'lumotlar saqlanmaydi. Chiqishni xohlaysizmi?" confirmText="Chiqish" danger />
    </form>
  );
}
