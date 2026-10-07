import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, KeyRound, Loader2, LogOut, Menu, Moon, Search, Sun, UserCog, AlertTriangle, WifiOff, Info } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLive, useNow } from '@/context/LiveContext';
import { useToast } from '@/context/ToastContext';
import * as api from '@/services/api';
import type { Notification, SearchResult } from '@/types';
import { formatClock, formatFullDate } from '@/utils/date';
import { ROLE_LABELS } from '@/utils/format';
import { useDebounced, usePageTitleValue } from '@/utils/hooks';
import { Avatar, TypeBadge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { Tooltip } from '@/components/ui/Tooltip';
import { useClickOutside } from '@/components/ui/DatePicker';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolved, toggle } = useTheme();
  const label = resolved === 'dark' ? "Kunduzgi rejimga o'tish" : "Tungi rejimga o'tish";
  return (
    <Tooltip content={label} side="bottom">
      <button onClick={toggle} aria-label={label} className={`focus-ring relative grid h-10 w-10 place-items-center overflow-hidden rounded-ctl border border-border bg-surface text-muted transition-colors hover:text-text ${className}`}>
        <Sun size={18} className={`absolute transition-all duration-300 ${resolved === 'dark' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0'}`} />
        <Moon size={18} className={`absolute transition-all duration-300 ${resolved === 'dark' ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} />
      </button>
    </Tooltip>
  );
}

export function LiveDot({ label = 'Jonli' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-ink">
      <span className="pulse-dot !h-2 !w-2" />
      {label}
    </span>
  );
}

function GlobalSearch() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [res, setRes] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const dq = useDebounced(q, 250);
  const inputRef = useRef<HTMLInputElement>(null);
  const ref = useClickOutside(open, () => setOpen(false));
  const nav = useNavigate();

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  useEffect(() => {
    if (!dq.trim()) {
      setRes(null);
      return;
    }
    let alive = true;
    setLoading(true);
    api
      .searchPeople(dq)
      .then((r) => alive && (setRes(r), setActive(0)))
      .catch(() => alive && setRes([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [dq]);

  const go = (r: SearchResult) => {
    setOpen(false);
    setQ('');
    nav(r.type === 'teacher' ? `/oqituvchilar/${r.id}` : `/talabalar/${r.id}`);
  };

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!res?.length) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(res.length - 1, a + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === 'Enter') go(res[active]);
        }}
        placeholder="Talaba yoki o'qituvchini qidirish..."
        aria-label="Talaba yoki o'qituvchini qidirish"
        className="input pl-10 pr-16"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-muted sm:block">Ctrl K</kbd>
      {open && q.trim() && (
        <div className="anim-pop absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-card border border-border bg-surface shadow-pop" role="listbox">
          {loading && !res ? (
            <div className="flex items-center gap-2 p-4 text-sm text-muted">
              <Loader2 size={16} className="animate-spin" /> Qidirilmoqda...
            </div>
          ) : res && res.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted">Hech narsa topilmadi</div>
          ) : (
            <ul className="max-h-[420px] overflow-y-auto p-1.5">
              {res?.map((r, i) => (
                <li key={r.type + r.id}>
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(r)}
                    role="option"
                    aria-selected={i === active}
                    className={`flex w-full items-center gap-3 rounded-ctl px-2.5 py-2 text-left ${i === active ? 'bg-surface-2' : ''}`}
                  >
                    <Avatar name={r.fullName} photo={r.photo} size={34} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-text">{r.fullName}</div>
                      <div className="truncate text-xs text-muted">{r.sub}</div>
                    </div>
                    <TypeBadge type={r.type} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const ref = useClickOutside(open, () => setOpen(false));
  const nav = useNavigate();
  const { tick } = useLive();
  const load = () => api.getNotifications().then(setItems).catch(() => undefined);
  useEffect(() => {
    void load();
  }, [tick]);
  const unread = items.filter((n) => !n.read);
  const icon = (k: Notification['kind']) =>
    k === 'danger' ? (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-danger-soft text-danger-ink"><WifiOff size={17} /></span>
    ) : k === 'warning' ? (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-warning-soft text-warning-ink"><AlertTriangle size={17} /></span>
    ) : (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-info-soft text-info-ink"><Info size={17} /></span>
    );

  return (
    <div ref={ref} className="relative">
      <Tooltip content="Bildirishnomalar" side="bottom">
        <button onClick={() => setOpen((o) => !o)} aria-label="Bildirishnomalar" aria-expanded={open} className="focus-ring relative grid h-10 w-10 place-items-center rounded-ctl border border-border bg-surface text-muted hover:text-text">
          <Bell size={18} />
          {unread.length > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-danger-fg">{unread.length}</span>}
        </button>
      </Tooltip>
      {open && (
        <div className="anim-pop absolute right-0 top-full z-50 mt-2 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-card border border-border bg-surface shadow-pop">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-text">Bildirishnomalar</h3>
            {unread.length > 0 && <span className="pill bg-danger-soft text-danger-ink">{unread.length} ta yangi</span>}
          </div>
          {unread.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted">Yangi bildirishnomalar yo'q</div>
          ) : (
            <ul className="max-h-80 overflow-y-auto p-1.5">
              {unread.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => {
                      setOpen(false);
                      void api.markNotificationsRead([n.id]).then(load);
                      nav(n.link);
                    }}
                    className="flex w-full items-center gap-3 rounded-ctl px-2.5 py-2.5 text-left text-sm font-medium text-text hover:bg-surface-2"
                  >
                    {icon(n.kind)}
                    <span className="flex-1">{n.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {unread.length > 0 && (
            <div className="border-t border-border p-2">
              <button
                onClick={() => void api.markNotificationsRead(unread.map((n) => n.id)).then(load)}
                className="focus-ring w-full rounded-lg py-2 text-sm font-semibold text-primary-ink hover:bg-primary-soft"
              >
                Barchasini o'qilgan deb belgilash
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ current: '', next: '', confirm: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setF({ current: '', next: '', confirm: '' });
      setErr({});
    }
  }, [open]);
  const submit = async () => {
    const e: Record<string, string> = {};
    if (!f.current) e.current = "Bu maydon to'ldirilishi shart";
    if (!f.next) e.next = "Bu maydon to'ldirilishi shart";
    else if (f.next.length < 8) e.next = "Parol kamida 8 ta belgidan iborat bo'lishi kerak";
    if (!f.confirm) e.confirm = "Bu maydon to'ldirilishi shart";
    else if (f.next !== f.confirm) e.confirm = 'Parollar mos kelmadi';
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await api.changePassword(user!.id, f.current, f.next);
      toast.success("Parol muvaffaqiyatli o'zgartirildi");
      onClose();
    } catch (x) {
      const ae = x as api.ApiError;
      if (ae.field) setErr({ [ae.field]: ae.message });
      else toast.error(ae.message);
    } finally {
      setBusy(false);
    }
  };
  const dirty = !!(f.current || f.next || f.confirm);
  return (
    <Modal
      open={open}
      onClose={onClose}
      dirty={dirty}
      title="Parolni o'zgartirish"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button onClick={submit} loading={busy}>
            Saqlash
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {(
          [
            ['current', 'Joriy parol'],
            ['next', 'Yangi parol'],
            ['confirm', 'Yangi parolni tasdiqlang'],
          ] as const
        ).map(([k, label]) => (
          <Field key={k} label={label} required error={err[k]} htmlFor={`pw-${k}`}>
            <Input id={`pw-${k}`} type="password" autoComplete={k === 'current' ? 'current-password' : 'new-password'} value={f[k]} invalid={!!err[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
          </Field>
        ))}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

function UserMenu({ onLogout }: { onLogout: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<'profile' | 'password' | null>(null);
  const ref = useClickOutside(open, () => setOpen(false));
  if (!user) return null;
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label="Foydalanuvchi menyusi" aria-expanded={open} className="focus-ring flex h-10 items-center gap-2 rounded-ctl border border-border bg-surface pl-1 pr-2 hover:bg-surface-2">
        <Avatar name={user.fullName} size={32} />
        <ChevronDown size={15} className="text-muted" />
      </button>
      {open && (
        <div className="anim-pop absolute right-0 top-full z-50 mt-2 w-64 rounded-card border border-border bg-surface p-1.5 shadow-pop" role="menu">
          <div className="flex items-center gap-3 border-b border-border px-2.5 pb-3 pt-2">
            <Avatar name={user.fullName} size={40} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-text">{user.fullName}</div>
              <div className="text-xs text-muted">{ROLE_LABELS[user.role]}</div>
            </div>
          </div>
          {(
            [
              ['Profil sozlamalari', <UserCog size={17} key="i" />, () => setModal('profile')],
              ["Parolni o'zgartirish", <KeyRound size={17} key="i" />, () => setModal('password')],
            ] as const
          ).map(([label, icon, fn]) => (
            <button
              key={label}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                fn();
              }}
              className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-text hover:bg-surface-2"
            >
              <span className="text-muted">{icon}</span>
              {label}
            </button>
          ))}
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-danger-ink hover:bg-danger-soft"
          >
            <LogOut size={17} />
            Chiqish
          </button>
        </div>
      )}
      <Modal open={modal === 'profile'} onClose={() => setModal(null)} title="Profil sozlamalari" size="sm" footer={<Button onClick={() => setModal(null)}>Yopish</Button>}>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar name={user.fullName} size={52} />
            <div>
              <div className="font-semibold text-text">{user.fullName}</div>
              <div className="text-sm text-muted">{ROLE_LABELS[user.role]}</div>
            </div>
          </div>
          <Field label="F.I.Sh" htmlFor="pf-name">
            <Input id="pf-name" value={user.fullName} readOnly />
          </Field>
          <Field label="Login" htmlFor="pf-login">
            <Input id="pf-login" value={user.login} readOnly />
          </Field>
        </div>
      </Modal>
      <ChangePasswordModal open={modal === 'password'} onClose={() => setModal(null)} />
    </div>
  );
}

export function Header({ onMenu, onLogout }: { onMenu: () => void; onLogout: () => void }) {
  const title = usePageTitleValue();
  const now = useNow();
  return (
    <header className="no-print sticky top-0 z-20 border-b border-border backdrop-blur" style={{ background: 'color-mix(in srgb, var(--bg) 92%, transparent)' }}>
      <div className="flex h-[72px] items-center gap-3 px-4 sm:px-6">
        <IconButton label="Menyuni ochish" className="lg:hidden" onClick={onMenu}>
          <Menu size={20} />
        </IconButton>
        <div className="min-w-0 flex-1 md:flex-none">
          <div className="truncate text-lg font-bold leading-tight text-text">{title}</div>
          <div className="mt-0.5 flex items-center gap-2 truncate text-xs text-muted">
            <span className="hidden truncate sm:inline">{formatFullDate(now)}</span>
            <span className="hidden sm:inline">·</span>
            <LiveDot />
            <span className="font-semibold tabular text-text">{formatClock(now)}</span>
          </div>
        </div>
        <div className="hidden flex-1 justify-center px-4 md:flex">
          <GlobalSearch />
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Notifications />
          <UserMenu onLogout={onLogout} />
        </div>
      </div>
      <div className="px-4 pb-3 md:hidden">
        <GlobalSearch />
      </div>
    </header>
  );
}
