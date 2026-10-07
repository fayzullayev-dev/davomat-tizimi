import { Link } from 'react-router-dom';
import { Home, ShieldOff } from 'lucide-react';
import { useDocumentTitle } from '@/utils/hooks';

function StatusPage({ code, icon, title, text }: { code?: string; icon?: React.ReactNode; title: string; text: string }) {
  useDocumentTitle(title);
  return (
    <div className="card mx-auto flex max-w-xl flex-col items-center px-6 py-16 text-center">
      {code ? (
        <div className="text-7xl font-extrabold tracking-tight text-primary-ink tabular">{code}</div>
      ) : (
        <span className="grid h-20 w-20 place-items-center rounded-full bg-danger-soft text-danger-ink">{icon}</span>
      )}
      <h1 className="mt-5 text-2xl font-bold text-text">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">{text}</p>
      <Link to="/" className="focus-ring mt-6 inline-flex h-10 items-center gap-2 rounded-ctl bg-primary px-4 text-sm font-semibold text-primary-fg hover:bg-primary-hover">
        <Home size={16} />
        Bosh sahifaga qaytish
      </Link>
    </div>
  );
}

export function NotFoundPage() {
  return <StatusPage code="404" title="Sahifa topilmadi" text="Siz qidirgan sahifa mavjud emas yoki o'chirilgan." />;
}
export function ForbiddenPage() {
  return <StatusPage icon={<ShieldOff size={36} />} title="Ruxsat yo'q" text="Bu sahifani ko'rish uchun sizda ruxsat mavjud emas." />;
}
