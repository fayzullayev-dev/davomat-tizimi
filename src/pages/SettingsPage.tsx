import { useEffect, useState, type ReactNode } from 'react';
import { CalendarOff, Clock, Info, KeyRound, Lock, MonitorCog, MoreVertical, Palette, Pencil, Plus, Server, Trash2, Unlock, Upload, Users, WifiOff } from 'lucide-react';
import * as api from '@/services/api';
import type { Holiday, Role, Settings, User } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useTheme, type ThemePref } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { WEEKDAYS, WEEK_MON_FIRST, formatDateTime, formatDayMonth, formatShortDate } from '@/utils/date';
import { ROLE_LABELS } from '@/utils/format';
import { setBrandLogo, useAsync, useDocumentTitle, useQueryState } from '@/utils/hooks';
import { Avatar, Pill } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Checkbox, Field, Input, RadioGroup, Select, TimeInput, Toggle } from '@/components/ui/Form';
import { ConfirmModal, Modal } from '@/components/ui/Modal';
import { Card, DropdownMenu, EmptyState, ErrorState, InfoBanner, PageHeader, Skeleton, TableSkeleton, UnderlineTabs, type MenuItem } from '@/components/ui/Misc';

type Tab = 'vaqt' | 'dam' | 'foydalanuvchilar' | 'tizim' | 'korinish';
const REQ = "Bu maydon to'ldirilishi shart";

function SectionCard({ title, icon, children, footer }: { title: string; icon: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="mb-5 flex items-center gap-2.5 text-base font-semibold text-text">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary-ink">{icon}</span>
        {title}
      </h2>
      {children}
      {footer && <div className="mt-6 flex justify-end border-t border-border pt-4">{footer}</div>}
    </Card>
  );
}

// ---------- Ish va dars vaqti ----------
function TimeTab({ s, onSaved }: { s: Settings; onSaved: () => void }) {
  const [f, setF] = useState({ teacherStart: s.teacherStart, teacherEnd: s.teacherEnd, teacherThreshold: String(s.teacherThreshold), studentStart: s.studentStart, studentThreshold: String(s.studentThreshold) });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const valid = (v: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
  const save = async () => {
    const e: Record<string, string> = {};
    (['teacherStart', 'teacherEnd', 'studentStart'] as const).forEach((k) => {
      if (!f[k]) e[k] = REQ;
      else if (!valid(f[k])) e[k] = "Vaqt noto'g'ri (masalan: 08:30)";
    });
    (['teacherThreshold', 'studentThreshold'] as const).forEach((k) => {
      if (f[k] === '') e[k] = REQ;
      else if (Number(f[k]) > 120) e[k] = "120 daqiqadan oshmasligi kerak";
    });
    if (!e.teacherEnd && !e.teacherStart && f.teacherEnd <= f.teacherStart) e.teacherEnd = "Tugash vaqti boshlanish vaqtidan keyin bo'lishi kerak";
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await api.saveSettings({ teacherStart: f.teacherStart, teacherEnd: f.teacherEnd, teacherThreshold: Number(f.teacherThreshold), studentStart: f.studentStart, studentThreshold: Number(f.studentThreshold) });
      toast.success('Saqlandi');
      onSaved();
    } catch (x) {
      toast.error((x as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const num = (k: 'teacherThreshold' | 'studentThreshold') => (
    <input id={k} inputMode="numeric" className="input w-28 tabular" aria-invalid={!!err[k] || undefined} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value.replace(/\D/g, '').slice(0, 3) })} />
  );
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="O'qituvchilar" icon={<Users size={17} />}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Ish boshlanish vaqti" required error={err.teacherStart} htmlFor="teacherStart"><TimeInput id="teacherStart" value={f.teacherStart} onChange={(v) => setF({ ...f, teacherStart: v })} /></Field>
            <Field label="Ish tugash vaqti" required error={err.teacherEnd} htmlFor="teacherEnd"><TimeInput id="teacherEnd" value={f.teacherEnd} onChange={(v) => setF({ ...f, teacherEnd: v })} /></Field>
            <Field label="Kechikish chegarasi (daqiqa)" required error={err.teacherThreshold} htmlFor="teacherThreshold">{num('teacherThreshold')}</Field>
          </div>
        </SectionCard>
        <SectionCard title="Talabalar" icon={<Users size={17} />}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Dars boshlanish vaqti" required error={err.studentStart} htmlFor="studentStart"><TimeInput id="studentStart" value={f.studentStart} onChange={(v) => setF({ ...f, studentStart: v })} /></Field>
            <Field label="Kechikish chegarasi (daqiqa)" required error={err.studentThreshold} htmlFor="studentThreshold">{num('studentThreshold')}</Field>
          </div>
        </SectionCard>
      </div>
      <InfoBanner tone="info" icon={<Info size={18} />}>Belgilangan vaqtdan keyin chegaradan ortiq kelganlar «Kechikdi» deb belgilanadi.</InfoBanner>
      <div className="flex justify-end"><Button loading={busy} onClick={save}>Saqlash</Button></div>
    </div>
  );
}

// ---------- Dam olish kunlari ----------
function HolidaysTab({ s, onSaved }: { s: Settings; onSaved: () => void }) {
  const toast = useToast();
  const [weekend, setWeekend] = useState<number[]>(s.weekendDays);
  const [busy, setBusy] = useState(false);
  const [add, setAdd] = useState<{ date: string; name: string; recurring: boolean } | null>(null);
  const [addErr, setAddErr] = useState<Record<string, string>>({});
  const [del, setDel] = useState<Holiday | null>(null);
  const saveWeekend = async () => {
    setBusy(true);
    try {
      await api.saveSettings({ weekendDays: weekend });
      toast.success('Saqlandi');
      onSaved();
    } catch (x) {
      toast.error((x as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const saveHoliday = async () => {
    if (!add) return;
    const e: Record<string, string> = {};
    if (!add.date) e.date = REQ;
    if (!add.name.trim()) e.name = REQ;
    setAddErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await api.addHoliday({ date: add.date, name: add.name.trim(), recurring: add.recurring });
      toast.success('Saqlandi');
      setAdd(null);
      onSaved();
    } catch (x) {
      toast.error((x as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const removeHoliday = async () => {
    if (!del) return;
    setBusy(true);
    try {
      await api.deleteHoliday(del.id);
      toast.success("O'chirildi");
      setDel(null);
      onSaved();
    } catch (x) {
      toast.error((x as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      <SectionCard title="Haftalik dam olish kunlari" icon={<CalendarOff size={17} />} footer={<Button loading={busy && !add && !del} onClick={saveWeekend}>Saqlash</Button>}>
        <div className="flex flex-wrap gap-2">
          {WEEK_MON_FIRST.map((d) => {
            const on = weekend.includes(d);
            const locked = d === 0;
            return (
              <label key={d} className={`flex h-11 cursor-pointer items-center gap-2 rounded-ctl border px-4 text-sm font-medium ${on ? 'border-primary bg-primary-soft text-primary-ink' : 'border-border bg-surface-2 text-text'} ${locked ? 'cursor-not-allowed opacity-80' : ''}`}>
                <Checkbox checked={on} disabled={locked} onChange={(v) => setWeekend((w) => (v ? [...w, d] : w.filter((x) => x !== d)))} />
                {WEEKDAYS[d]}
              </label>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Bayram kunlari" icon={<CalendarOff size={17} />}>
        <div className="mb-4 flex justify-end">
          <Button variant="soft" icon={<Plus size={16} />} onClick={() => { setAddErr({}); setAdd({ date: '', name: '', recurring: false }); }}>Bayram qo'shish</Button>
        </div>
        {s.holidays.length ? (
          <ul className="divide-y divide-border rounded-ctl border border-border">
            {s.holidays.map((h) => (
              <li key={h.id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-28 shrink-0 text-sm font-semibold text-text tabular">{h.recurring ? formatDayMonth(h.date) : formatShortDate(h.date)}</span>
                <span className="flex-1 text-sm text-text">{h.name}</span>
                {h.recurring ? <Pill tone="primary">Har yili</Pill> : <Pill tone="neutral">Bir martalik</Pill>}
                <IconButton size="sm" tone="danger" label="O'chirish" onClick={() => setDel(h)}><Trash2 size={15} /></IconButton>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState text="Bayram kunlari qo'shilmagan" />
        )}
      </SectionCard>
      <InfoBanner tone="info" icon={<Info size={18} />}>Dam olish va bayram kunlarida hech kim «Kelmadi» deb hisoblanmaydi.</InfoBanner>

      <Modal open={!!add} onClose={() => setAdd(null)} title="Bayram qo'shish" description="Masalan: Ramazon hayiti, Qurbon hayiti" size="sm" footer={<><Button variant="outline" onClick={() => setAdd(null)}>Bekor qilish</Button><Button loading={busy} onClick={saveHoliday}>Saqlash</Button></>}>
        {add && (
          <div className="space-y-4">
            <Field label="Sana" required error={addErr.date} htmlFor="h-date"><DatePicker id="h-date" value={add.date} invalid={!!addErr.date} onChange={(v) => setAdd({ ...add, date: v })} /></Field>
            <Field label="Nomi" required error={addErr.name} htmlFor="h-name"><Input id="h-name" value={add.name} invalid={!!addErr.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} placeholder="Bayram nomi" /></Field>
            <Checkbox checked={add.recurring} onChange={(v) => setAdd({ ...add, recurring: v })} label="Har yili shu sanada takrorlanadi" />
          </div>
        )}
      </Modal>
      <ConfirmModal open={!!del} onClose={() => setDel(null)} onConfirm={removeHoliday} loading={busy} danger confirmText="O'chirish" title="Rostdan ham o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi." text={del?.name} />
    </div>
  );
}

// ---------- Foydalanuvchilar ----------
type UForm = { id?: string; fullName: string; login: string; password: string; role: Role | '' };
function UsersTab() {
  const { user: me } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload, refresh } = useAsync(() => api.getUsers(), []);
  const [form, setForm] = useState<UForm | null>(null);
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [reset, setReset] = useState<User | null>(null);
  const [pwd, setPwd] = useState({ a: '', b: '' });
  const [confirm, setConfirm] = useState<{ kind: 'block' | 'unblock' | 'delete'; u: User } | null>(null);

  const saveUser = async () => {
    if (!form) return;
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = REQ;
    if (!form.login.trim()) e.login = REQ;
    else if (!/^[a-z0-9_.]{3,}$/i.test(form.login)) e.login = "Login kamida 3 ta lotin harfi yoki raqamdan iborat bo'lishi kerak";
    if (!form.id) {
      if (!form.password) e.password = REQ;
      else if (form.password.length < 8) e.password = "Parol kamida 8 ta belgidan iborat bo'lishi kerak";
    }
    if (!form.role) e.role = REQ;
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await api.saveUser({ id: form.id, fullName: form.fullName.trim(), login: form.login.trim(), password: form.password, role: form.role as Role });
      toast.success('Saqlandi');
      setForm(null);
      void refresh();
    } catch (x) {
      const ae = x as api.ApiError;
      if (ae.field) setErr({ [ae.field]: ae.message });
      else toast.error(ae.message);
    } finally {
      setBusy(false);
    }
  };
  const savePwd = async () => {
    const e: Record<string, string> = {};
    if (!pwd.a) e.a = REQ;
    else if (pwd.a.length < 8) e.a = "Parol kamida 8 ta belgidan iborat bo'lishi kerak";
    if (!pwd.b) e.b = REQ;
    else if (pwd.a !== pwd.b) e.b = 'Parollar mos kelmadi';
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await api.resetUserPassword(reset!.id, pwd.a);
      toast.success("Parol muvaffaqiyatli o'zgartirildi");
      setReset(null);
    } catch (x) {
      toast.error((x as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const doConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === 'delete') await api.deleteUser(confirm.u.id);
      else await api.setUserActive(confirm.u.id, confirm.kind === 'unblock');
      toast.success(confirm.kind === 'delete' ? "Foydalanuvchi o'chirildi" : confirm.kind === 'block' ? 'Foydalanuvchi bloklandi' : 'Foydalanuvchi blokdan chiqarildi');
      setConfirm(null);
      void refresh();
    } catch (x) {
      toast.error((x as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const menu = (u: User): MenuItem[] => {
    const items: MenuItem[] = [
      { label: 'Tahrirlash', icon: <Pencil size={16} />, onClick: () => { setErr({}); setForm({ id: u.id, fullName: u.fullName, login: u.login, password: '', role: u.role }); } },
      { label: 'Parolni tiklash', icon: <KeyRound size={16} />, onClick: () => { setErr({}); setPwd({ a: '', b: '' }); setReset(u); } },
    ];
    if (u.id !== me?.id) {
      items.push(u.active ? { label: 'Bloklash', icon: <Lock size={16} />, onClick: () => setConfirm({ kind: 'block', u }) } : { label: 'Blokdan chiqarish', icon: <Unlock size={16} />, onClick: () => setConfirm({ kind: 'unblock', u }) });
      items.push({ label: "O'chirish", icon: <Trash2 size={16} />, danger: true, onClick: () => setConfirm({ kind: 'delete', u }) });
    }
    return items;
  };
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button icon={<Plus size={16} />} onClick={() => { setErr({}); setForm({ fullName: '', login: '', password: '', role: '' }); }}>Foydalanuvchi qo'shish</Button>
      </div>
      <Card className="overflow-hidden">
        {loading ? <TableSkeleton rows={3} cols={6} /> : error ? <ErrorState onRetry={reload} /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-separate border-spacing-0">
              <thead>
                <tr className="[&>th]:border-b [&>th]:border-border [&>th]:bg-surface-2">
                  <th className="th">F.I.Sh</th><th className="th">Login</th><th className="th">Rol</th><th className="th">Holati</th><th className="th">So'nggi kirish</th><th className="th text-right">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {data!.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-2 [&>td]:border-b [&>td]:border-border">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.fullName} size={34} />
                        <span className="font-semibold">{u.fullName}</span>
                        {u.id === me?.id && <Pill tone="info">Siz</Pill>}
                      </div>
                    </td>
                    <td className="td tabular text-muted">{u.login}</td>
                    <td className="td"><Pill tone="primary">{ROLE_LABELS[u.role]}</Pill></td>
                    <td className="td">{u.active ? <Pill tone="success">Faol</Pill> : <Pill tone="danger">Bloklangan</Pill>}</td>
                    <td className="td whitespace-nowrap tabular text-muted">{formatDateTime(u.lastLogin)}</td>
                    <td className="td text-right"><DropdownMenu label="Amallar" trigger={<MoreVertical size={16} />} items={menu(u)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Foydalanuvchini tahrirlash' : "Foydalanuvchi qo'shish"} size="sm" footer={<><Button variant="outline" onClick={() => setForm(null)}>Bekor qilish</Button><Button loading={busy} onClick={saveUser}>Saqlash</Button></>}>
        {form && (
          <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); void saveUser(); }}>
            <Field label="F.I.Sh" required error={err.fullName} htmlFor="u-fn"><Input id="u-fn" value={form.fullName} invalid={!!err.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Familiya Ism Otasining ismi" /></Field>
            <Field label="Login" required error={err.login} htmlFor="u-login"><Input id="u-login" autoComplete="off" value={form.login} invalid={!!err.login} onChange={(e) => setForm({ ...form, login: e.target.value })} placeholder="Loginni kiriting" /></Field>
            {!form.id && <Field label="Parol" required error={err.password} htmlFor="u-pwd"><Input id="u-pwd" type="password" autoComplete="new-password" value={form.password} invalid={!!err.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Kamida 8 ta belgi" /></Field>}
            <Field label="Rol" required error={err.role} htmlFor="u-role">
              <Select id="u-role" value={form.role} invalid={!!err.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} placeholder="Rolni tanlang" disabled={form.id === me?.id} options={(Object.keys(ROLE_LABELS) as Role[]).map((r) => ({ value: r, label: ROLE_LABELS[r] }))} />
            </Field>
            <button type="submit" className="hidden" />
          </form>
        )}
      </Modal>
      <Modal open={!!reset} onClose={() => setReset(null)} title="Parolni tiklash" description={reset?.fullName} size="sm" footer={<><Button variant="outline" onClick={() => setReset(null)}>Bekor qilish</Button><Button loading={busy} onClick={savePwd}>Saqlash</Button></>}>
        <div className="space-y-4">
          <Field label="Yangi parol" required error={err.a} htmlFor="r-a"><Input id="r-a" type="password" autoComplete="new-password" value={pwd.a} invalid={!!err.a} onChange={(e) => setPwd({ ...pwd, a: e.target.value })} /></Field>
          <Field label="Yangi parolni tasdiqlang" required error={err.b} htmlFor="r-b"><Input id="r-b" type="password" autoComplete="new-password" value={pwd.b} invalid={!!err.b} onChange={(e) => setPwd({ ...pwd, b: e.target.value })} /></Field>
        </div>
      </Modal>
      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={doConfirm}
        loading={busy}
        danger={confirm?.kind !== 'unblock'}
        confirmText={confirm?.kind === 'delete' ? "O'chirish" : confirm?.kind === 'block' ? 'Bloklash' : 'Blokdan chiqarish'}
        title={confirm?.kind === 'delete' ? "Rostdan ham o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi." : confirm?.kind === 'block' ? 'Foydalanuvchini bloklamoqchimisiz? U tizimga kira olmaydi.' : 'Foydalanuvchini blokdan chiqarmoqchimisiz?'}
        text={confirm?.u.fullName}
      />
    </div>
  );
}

// ---------- Tizim ----------
function SystemTab({ s, onSaved }: { s: Settings; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ universityName: s.universityName, shortName: s.shortName, logo: s.logo });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(api.isOfflineMode());
  const pickLogo = (file?: File) => {
    if (!file) return;
    if (!/image\/(png|jpe?g|svg\+xml)/.test(file.type)) return setErr({ logo: 'Faqat PNG, JPG yoki SVG rasm yuklash mumkin' });
    if (file.size > 2 * 1024 * 1024) return setErr({ logo: 'Rasm hajmi 2 MB dan oshmasligi kerak' });
    const r = new FileReader();
    r.onload = () => setF((x) => ({ ...x, logo: String(r.result) }));
    r.readAsDataURL(file);
    setErr({});
  };
  const save = async () => {
    const e: Record<string, string> = {};
    if (!f.universityName.trim()) e.universityName = REQ;
    if (!f.shortName.trim()) e.shortName = REQ;
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await api.saveSettings(f);
      setBrandLogo(f.logo);
      toast.success('Saqlandi');
      onSaved();
    } catch (x) {
      toast.error((x as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      <SectionCard title="Universitet ma'lumotlari" icon={<Server size={17} />} footer={<Button loading={busy} onClick={save}>Saqlash</Button>}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Universitet nomi" required error={err.universityName} htmlFor="s-name"><Input id="s-name" value={f.universityName} invalid={!!err.universityName} onChange={(e) => setF({ ...f, universityName: e.target.value })} /></Field>
          <Field label="Qisqa nomi" required error={err.shortName} htmlFor="s-short"><Input id="s-short" value={f.shortName} invalid={!!err.shortName} onChange={(e) => setF({ ...f, shortName: e.target.value })} /></Field>
          <Field label="Logotip" error={err.logo} hint="PNG, JPG yoki SVG, 2 MB gacha">
            <div className="flex items-center gap-4">
              <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-ctl border border-border bg-surface-2">
                {f.logo ? <img src={f.logo} alt="Logotip" className="h-full w-full object-contain" /> : <Upload size={20} className="text-muted" />}
              </span>
              <label className="focus-within:ring-2 focus-within:ring-primary inline-flex h-10 cursor-pointer items-center gap-2 rounded-ctl border border-border bg-surface px-4 text-sm font-semibold text-text hover:bg-surface-2">
                <Upload size={16} /> Logotip yuklash
                <input type="file" accept="image/png,image/jpeg,image/svg+xml" className="sr-only" onChange={(e) => pickLogo(e.target.files?.[0])} />
              </label>
              {f.logo && <Button variant="ghost" size="sm" className="!text-danger-ink" onClick={() => setF({ ...f, logo: null })}>O'chirish</Button>}
            </div>
          </Field>
        </div>
      </SectionCard>
      <SectionCard title="Sinov rejimi" icon={<WifiOff size={17} />}>
        <p className="mb-3 text-sm text-muted">Tarmoq uzilishini sinash uchun. Yoqilganda yuqorida «Internet aloqasi yo'q» xabari chiqadi va ma'lumotlar yuklanmaydi.</p>
        <Toggle checked={offline} onChange={(v) => { setOffline(v); api.setOfflineMode(v); }} label="Tarmoq uzilgan (sinov)" offLabel="Tarmoq ulangan" />
      </SectionCard>
    </div>
  );
}

// ---------- Ko'rinish ----------
function ThemePreview({ dark }: { dark: boolean }) {
  const bg = dark ? '#0E1512' : '#F4F7F5';
  const sf = dark ? '#16201B' : '#FFFFFF';
  const ln = dark ? '#2A3A31' : '#E3EAE5';
  const pr = dark ? '#22B35E' : '#00873A';
  return (
    <svg viewBox="0 0 160 96" className="h-full w-full" aria-hidden="true">
      <rect width="160" height="96" fill={bg} />
      <rect x="0" y="0" width="38" height="96" fill={sf} />
      <rect x="8" y="10" width="22" height="6" rx="3" fill={pr} />
      <rect x="8" y="24" width="22" height="4" rx="2" fill={ln} />
      <rect x="8" y="32" width="22" height="4" rx="2" fill={ln} />
      <rect x="46" y="10" width="50" height="30" rx="6" fill={pr} />
      <rect x="102" y="10" width="50" height="30" rx="6" fill={sf} />
      <rect x="46" y="48" width="106" height="40" rx="6" fill={sf} />
      <rect x="54" y="58" width="60" height="4" rx="2" fill={ln} />
      <rect x="54" y="68" width="80" height="4" rx="2" fill={ln} />
    </svg>
  );
}
function AppearanceTab() {
  const { pref, setPref, density, setDensity } = useTheme();
  const opts: { value: ThemePref; label: string }[] = [
    { value: 'light', label: 'Kunduzgi' },
    { value: 'dark', label: 'Tungi' },
    { value: 'system', label: 'Tizim bo\'yicha' },
  ];
  return (
    <div className="space-y-5">
      <SectionCard title="Mavzu" icon={<Palette size={17} />}>
        <div className="grid gap-4 sm:grid-cols-3" role="radiogroup" aria-label="Mavzu">
          {opts.map((o) => {
            const on = pref === o.value;
            return (
              <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => setPref(o.value)} className={`focus-ring overflow-hidden rounded-card border-2 text-left transition-colors ${on ? 'border-primary' : 'border-border hover:border-border-strong'}`}>
                <div className="aspect-[5/3] w-full">
                  {o.value === 'system' ? (
                    <div className="relative h-full w-full">
                      <div className="absolute inset-0" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}><ThemePreview dark={false} /></div>
                      <div className="absolute inset-0" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}><ThemePreview dark /></div>
                    </div>
                  ) : (
                    <ThemePreview dark={o.value === 'dark'} />
                  )}
                </div>
                <div className="flex items-center gap-2 border-t border-border bg-surface px-4 py-3">
                  <span className={`grid h-4 w-4 place-items-center rounded-full border-2 ${on ? 'border-primary' : 'border-border-strong'}`}>{on && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}</span>
                  <span className="text-sm font-semibold text-text">{o.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </SectionCard>
      <SectionCard title="Jadval zichligi" icon={<MonitorCog size={17} />}>
        <RadioGroup value={density} onChange={setDensity} options={[{ value: 'normal', label: 'Oddiy' }, { value: 'compact', label: 'Ixcham' }]} />
      </SectionCard>
    </div>
  );
}

export default function SettingsPage() {
  useDocumentTitle('Sozlamalar');
  const { can } = useAuth();
  const full = can('manage');
  const [q, setQ] = useQueryState({ tab: full ? 'vaqt' : 'korinish' });
  const tab = (full ? q.tab : 'korinish') as Tab;
  const { data, loading, error, reload, refresh } = useAsync(() => api.getSettings(), []);
  const [ver, setVer] = useState(0);
  useEffect(() => {
    if (data) setBrandLogo(data.logo);
  }, [data]);
  const saved = () => {
    void refresh().then(() => setVer((v) => v + 1));
  };
  const items: { value: Tab; label: string; icon: ReactNode }[] = full
    ? [
        { value: 'vaqt', label: 'Ish va dars vaqti', icon: <Clock size={16} /> },
        { value: 'dam', label: 'Dam olish kunlari', icon: <CalendarOff size={16} /> },
        { value: 'foydalanuvchilar', label: 'Foydalanuvchilar', icon: <Users size={16} /> },
        { value: 'tizim', label: 'Tizim', icon: <Server size={16} /> },
        { value: 'korinish', label: "Ko'rinish", icon: <Palette size={16} /> },
      ]
    : [{ value: 'korinish', label: "Ko'rinish", icon: <Palette size={16} /> }];
  const needsSettings = tab === 'vaqt' || tab === 'dam' || tab === 'tizim';
  return (
    <div>
      <PageHeader title="Sozlamalar" />
      <UnderlineTabs value={tab} onChange={(v) => setQ({ tab: v })} items={items} />
      <div className="mt-5">
        {needsSettings && (loading ? <Skeleton className="h-72 w-full !rounded-card" /> : error || !data ? <Card><ErrorState onRetry={reload} /></Card> : (
          <>
            {tab === 'vaqt' && <TimeTab key={ver} s={data} onSaved={saved} />}
            {tab === 'dam' && <HolidaysTab key={ver} s={data} onSaved={saved} />}
            {tab === 'tizim' && <SystemTab key={ver} s={data} onSaved={saved} />}
          </>
        ))}
        {tab === 'foydalanuvchilar' && <UsersTab />}
        {tab === 'korinish' && <AppearanceTab />}
      </div>
    </div>
  );
}
