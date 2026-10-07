import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Tooltip } from './Tooltip';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger' | 'soft';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover',
  outline: 'border border-border bg-surface text-text hover:bg-surface-2 hover:border-border-strong',
  ghost: 'text-muted hover:bg-surface-2 hover:text-text',
  danger: 'bg-danger text-danger-fg hover:opacity-90',
  soft: 'bg-primary-soft text-primary-ink hover:brightness-95',
};
const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className = '', children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`focus-ring inline-flex shrink-0 items-center justify-center rounded-ctl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
    </button>
  );
});

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tone?: 'default' | 'danger' | 'primary';
  size?: 'sm' | 'md';
}
/** Faqat ikonkali tugma — har doim tooltip va aria-label bilan */
export function IconButton({ label, tone = 'default', size = 'md', className = '', children, type = 'button', ...rest }: IconButtonProps) {
  const toneCls =
    tone === 'danger' ? 'text-muted hover:bg-danger-soft hover:text-danger-ink' : tone === 'primary' ? 'text-primary-ink hover:bg-primary-soft' : 'text-muted hover:bg-surface-2 hover:text-text';
  return (
    <Tooltip content={label}>
      <button
        type={type}
        aria-label={label}
        className={`focus-ring inline-grid shrink-0 place-items-center rounded-ctl transition-colors disabled:opacity-50 ${size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'} ${toneCls} ${className}`}
        {...rest}
      >
        {children}
      </button>
    </Tooltip>
  );
}
