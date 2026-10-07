import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Esc, fokus tuzog'i va fon bosilganda yopilish */
function useDialog(open: boolean, onClose: () => void, locked: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const first = el?.querySelector<HTMLElement>('[data-autofocus]') ?? el?.querySelectorAll<HTMLElement>(FOCUSABLE)[1] ?? el?.querySelector<HTMLElement>(FOCUSABLE);
    setTimeout(() => first?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !locked) {
        e.stopPropagation();
        closeRef.current();
      }
      if (e.key === 'Tab' && el) {
        const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (!items.length) return;
        const a = items[0];
        const b = items[items.length - 1];
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          b.focus();
        } else if (!e.shiftKey && document.activeElement === b) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open, locked]);
  return ref;
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Saqlanmagan ma'lumot bo'lsa — fon bosilganda va Esc'da yopilmaydi */
  dirty?: boolean;
}

export function Modal({ open, onClose, title, description, children, footer, size = 'md', dirty = false }: ModalProps) {
  const ref = useDialog(open, onClose, dirty);
  if (!open) return null;
  const w = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-5xl' }[size];
  return createPortal(
    <div className="no-print fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="anim-fade absolute inset-0 bg-overlay" onClick={() => !dirty && onClose()} />
      <div ref={ref} role="dialog" aria-modal="true" className={`anim-pop relative flex max-h-[92vh] w-full flex-col rounded-t-card bg-surface shadow-pop sm:rounded-card ${w}`} style={{ border: '1px solid var(--card-border)' }}>
        <div className="flex items-start gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-text">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <button onClick={onClose} aria-label="Yopish" title="Yopish" className="focus-ring -mr-1 rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-text">
            <X size={18} />
          </button>
        </div>
        {children && <div className="overflow-y-auto px-5 py-4">{children}</div>}
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  text?: string;
  confirmText?: string;
  danger?: boolean;
  loading?: boolean;
}
export function ConfirmModal({ open, onClose, onConfirm, title, text, confirmText = 'Tasdiqlash', danger = false, loading }: ConfirmProps) {
  const ref = useDialog(open, onClose, false);
  if (!open) return null;
  return createPortal(
    <div className="no-print fixed inset-0 z-[95] flex items-center justify-center p-4">
      <div className="anim-fade absolute inset-0 bg-overlay" onClick={onClose} />
      <div ref={ref} role="alertdialog" aria-modal="true" className="anim-pop relative w-full max-w-md rounded-card bg-surface p-6 shadow-pop" style={{ border: '1px solid var(--card-border)' }}>
        <div className="flex gap-4">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${danger ? 'bg-danger-soft text-danger-ink' : 'bg-warning-soft text-warning-ink'}`}>
            <AlertTriangle size={22} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-text">{title}</h2>
            {text && <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} data-autofocus>
            Bekor qilish
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={() => void onConfirm()}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}
export function Drawer({ open, onClose, title, children, footer }: DrawerProps) {
  const ref = useDialog(open, onClose, false);
  if (!open) return null;
  return createPortal(
    <div className="no-print fixed inset-0 z-[90]">
      <div className="anim-fade absolute inset-0 bg-overlay" onClick={onClose} />
      <div ref={ref} role="dialog" aria-modal="true" className="anim-drawer absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-surface shadow-pop" style={{ borderLeft: '1px solid var(--card-border)' }}>
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <h2 className="flex-1 text-base font-semibold text-text">{title}</h2>
          <button onClick={onClose} aria-label="Yopish" title="Yopish" className="focus-ring rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-text">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="border-t border-border p-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
