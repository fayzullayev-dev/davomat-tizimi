import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Loader2, Lock, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/utils/hooks';
import { Checkbox, Field, Input } from '@/components/ui/Form';
import { Tooltip } from '@/components/ui/Tooltip';
import { ThemeToggle } from '@/components/layout/Header';
import { Logo } from '@/components/layout/Logo';

const MAX_ATTEMPTS = 5;

function Illustration() {
  // Turniket va soatdan iborat yumshoq abstrakt rasm (oddiy shakllar)
  return (
    <svg viewBox="0 0 360 260" className="w-full max-w-md" aria-hidden="true">
      <circle cx="270" cy="70" r="46" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.45)" strokeWidth="3" />
      <path d="M270 44v26l17 10" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="270" cy="70" r="4" fill="#fff" />
      <rect x="40" y="110" width="44" height="130" rx="12" fill="rgba(255,255,255,0.16)" />
      <rect x="200" y="110" width="44" height="130" rx="12" fill="rgba(255,255,255,0.16)" />
      <rect x="52" y="124" width="20" height="8" rx="4" fill="#BBF7D0" />
      <rect x="212" y="124" width="20" height="8" rx="4" fill="rgba(255,255,255,0.4)" />
      <g stroke="rgba(255,255,255,0.75)" strokeWidth="6" strokeLinecap="round">
        <path d="M84 160h52" />
        <path d="M84 160l40 -26" opacity="0.5" />
        <path d="M84 160l40 26" opacity="0.5" />
      </g>
      <circle cx="84" cy="160" r="9" fill="#fff" />
      <rect x="20" y="240" width="320" height="4" rx="2" fill="rgba(255,255,255,0.25)" />
      <circle cx="150" cy="70" r="5" fill="rgba(255,255,255,0.35)" />
      <circle cx="120" cy="40" r="3" fill="rgba(255,255,255,0.3)" />
      <circle cx="330" cy="150" r="4" fill="rgba(255,255,255,0.3)" />
    </svg>
  );
}

export default function LoginPage() {
  useDocumentTitle('Tizimga kirish');
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [form, setForm] = useState({ login: '', password: '' });
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ login?: string; password?: string }>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (!lockUntil) return;
    const tick = () => {
      const s = Math.ceil((lockUntil - Date.now()) / 1000);
      if (s <= 0) {
        setLockUntil(null);
        setAttempts(0);
        setAlert(null);
        setLeft(0);
      } else setLeft(s);
    };
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [lockUntil]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockUntil) return;
    const errs: typeof errors = {};
    if (!form.login.trim()) errs.login = 'Loginni kiriting';
    if (!form.password) errs.password = 'Parolni kiriting';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    setAlert(null);
    try {
      await login(form.login, form.password, remember);
      const from = (loc.state as { from?: string } | null)?.from;
      nav(from && from !== '/kirish' ? from : '/', { replace: true });
    } catch (err) {
      const n = attempts + 1;
      setAttempts(n);
      if (n >= MAX_ATTEMPTS) {
        setLockUntil(Date.now() + 60_000);
        setAlert("Juda ko'p urinish. 1 daqiqadan so'ng qayta urinib ko'ring.");
      } else setAlert((err as Error).message || "Login yoki parol noto'g'ri");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-bg">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden p-12 text-white lg:flex" style={{ background: 'linear-gradient(135deg, #00873A 0%, #0A9C55 55%, #0FA968 100%)' }}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-3">
          <Logo size={48} inverted />
          <div>
            <div className="text-lg font-bold">Davomat tizimi</div>
            <div className="text-sm text-white/80">Universitet</div>
          </div>
        </div>
        <div className="relative">
          <Illustration />
          <h1 className="mt-10 text-4xl font-extrabold tracking-tight">Davomat tizimi</h1>
          <p className="mt-3 max-w-md text-lg leading-relaxed text-white/85">Universitet talabalari va o'qituvchilari davomatini kuzatish tizimi</p>
        </div>
        <div className="relative text-sm text-white/75">© 2026 Davomat tizimi</div>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <Logo size={44} />
          <div className="text-lg font-bold text-text">Davomat tizimi</div>
        </div>
        <div className="card w-full max-w-[420px] p-7 sm:p-9">
          <h2 className="text-2xl font-bold tracking-tight text-text">Tizimga kirish</h2>
          <p className="mt-1.5 text-sm text-muted">Davom etish uchun login va parolingizni kiriting</p>

          {alert && (
            <div role="alert" className="anim-fade mt-5 flex items-start gap-2.5 rounded-ctl bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger-ink">
              <AlertCircle size={18} className="mt-px shrink-0" />
              <span>{alert}</span>
            </div>
          )}

          <form onSubmit={submit} noValidate className="mt-6 space-y-4">
            <Field label="Login" error={errors.login} htmlFor="login">
              <Input
                id="login"
                autoComplete="username"
                autoFocus
                icon={<User size={17} />}
                placeholder="Loginni kiriting"
                value={form.login}
                invalid={!!errors.login}
                onChange={(e) => {
                  setForm({ ...form, login: e.target.value });
                  setErrors({ ...errors, login: undefined });
                }}
              />
            </Field>
            <Field label="Parol" error={errors.password} htmlFor="password">
              <Input
                id="password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                icon={<Lock size={17} />}
                placeholder="Parolni kiriting"
                value={form.password}
                invalid={!!errors.password}
                onChange={(e) => {
                  setForm({ ...form, password: e.target.value });
                  setErrors({ ...errors, password: undefined });
                }}
                right={
                  <Tooltip content={show ? 'Parolni yashirish' : "Parolni ko'rsatish"}>
                    <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Parolni yashirish' : "Parolni ko'rsatish"} className="focus-ring grid h-8 w-9 place-items-center rounded-lg text-muted hover:text-text">
                      {show ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </Tooltip>
                }
              />
            </Field>
            <Checkbox checked={remember} onChange={setRemember} label="Meni eslab qol" />
            <button
              type="submit"
              disabled={loading || !!lockUntil}
              className="focus-ring flex h-11 w-full items-center justify-center gap-2 rounded-ctl bg-primary text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={17} className="animate-spin" /> Tekshirilmoqda...
                </>
              ) : lockUntil ? (
                <span className="tabular">Kirish ({left} s)</span>
              ) : (
                'Kirish'
              )}
            </button>
          </form>
          <p className="mt-5 text-center text-xs leading-relaxed text-muted">Parolni unutdingizmi? Tizim administratoriga murojaat qiling.</p>
        </div>
        <p className="mt-8 text-xs text-muted">© 2026 Davomat tizimi</p>
      </div>
    </div>
  );
}
