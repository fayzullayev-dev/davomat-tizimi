import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, X, XCircle, Info } from 'lucide-react';

type Kind = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  kind: Kind;
  text: string;
}
interface ToastCtx {
  success: (t: string) => void;
  error: (t: string) => void;
  info: (t: string) => void;
}
const Ctx = createContext<ToastCtx>(null!);
let seq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const remove = useCallback((id: number) => setItems((x) => x.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (kind: Kind, text: string) => {
      const id = ++seq;
      setItems((x) => [...x.slice(-3), { id, kind, text }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove],
  );
  const [api] = useState<ToastCtx>(() => ({
    success: (t) => push('success', t),
    error: (t) => push('error', t),
    info: (t) => push('info', t),
  }));

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="no-print pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" aria-live="polite">
        {items.map((t) => {
          const Icon = t.kind === 'success' ? CheckCircle2 : t.kind === 'error' ? XCircle : Info;
          const tone = t.kind === 'success' ? 'text-success-ink bg-success-soft' : t.kind === 'error' ? 'text-danger-ink bg-danger-soft' : 'text-info-ink bg-info-soft';
          return (
            <div key={t.id} role="status" className="anim-toast pointer-events-auto flex items-start gap-3 rounded-ctl border border-border bg-surface p-3 shadow-pop">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${tone}`}>
                <Icon size={18} />
              </span>
              <p className="flex-1 pt-1.5 text-sm font-medium text-text">{t.text}</p>
              <button onClick={() => remove(t.id)} aria-label="Yopish" title="Yopish" className="focus-ring rounded-md p-1 text-muted hover:bg-surface-2 hover:text-text">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
export const useToast = () => useContext(Ctx);
