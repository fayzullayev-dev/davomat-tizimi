import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { formatPassport, formatPhone } from '@/utils/format';

interface FieldProps {
  label?: ReactNode;
  required?: boolean;
  error?: string | null;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
  name?: string;
}
/** Yorliq, majburiy belgi (*), xato va izoh matni bilan maydon */
export function Field({ label, required, error, hint, children, className = '', htmlFor, name }: FieldProps) {
  return (
    <div className={className} data-field={name}>
      {label && (
        <label htmlFor={htmlFor} className="label">
          {label}
          {required && <span className="ml-0.5 text-danger-ink">*</span>}
        </label>
      )}
      {children}
      {error ? <p className="mt-1.5 text-xs font-medium text-danger-ink" role="alert">{error}</p> : hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  right?: ReactNode;
  invalid?: boolean;
}
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ icon, right, invalid, className = '', ...rest }, ref) {
  return (
    <div className="relative">
      {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">{icon}</span>}
      <input ref={ref} aria-invalid={invalid || undefined} className={`input ${icon ? 'pl-10' : ''} ${right ? 'pr-11' : ''} ${className}`} {...rest} />
      {right && <span className="absolute right-1 top-1/2 -translate-y-1/2">{right}</span>}
    </div>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
  placeholder?: string;
  invalid?: boolean;
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ options, placeholder, invalid, className = '', ...rest }, ref) {
  return (
    <div className={`relative ${className}`}>
      <select ref={ref} aria-invalid={invalid || undefined} className="input cursor-pointer appearance-none pr-9" {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function Textarea(
  { invalid, className = '', ...rest },
  ref,
) {
  return <textarea ref={ref} aria-invalid={invalid || undefined} className={`input h-auto min-h-[88px] py-2.5 ${className}`} {...rest} />;
});

export function Checkbox({ checked, onChange, label, className = '', ...rest }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; className?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'checked'>) {
  return (
    <label className={`inline-flex cursor-pointer select-none items-center gap-2 text-sm text-text ${className}`}>
      <span className="relative inline-grid">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer h-[18px] w-[18px] cursor-pointer appearance-none rounded-[5px] border border-border-strong bg-surface transition-colors checked:border-primary checked:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1" {...rest} />
        <svg viewBox="0 0 16 16" className="pointer-events-none absolute inset-0 m-auto hidden h-3 w-3 text-primary-fg peer-checked:block" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8.5l3.2 3L13 4.5" />
        </svg>
      </span>
      {label}
    </label>
  );
}

export function RadioGroup<T extends string>({ value, onChange, options, name, invalid }: { value: T | ''; onChange: (v: T) => void; options: { value: T; label: string }[]; name?: string; invalid?: boolean }) {
  const id = useId();
  return (
    <div role="radiogroup" className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <label
            key={o.value}
            className={`flex h-10 cursor-pointer items-center gap-2 rounded-ctl border px-4 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-primary ${
              active ? 'border-primary bg-primary-soft text-primary-ink' : invalid ? 'border-danger text-text' : 'border-border bg-surface-2 text-text hover:border-border-strong'
            }`}
          >
            <input type="radio" name={name ?? id} className="sr-only" checked={active} onChange={() => onChange(o.value)} />
            <span className={`grid h-4 w-4 place-items-center rounded-full border-2 ${active ? 'border-primary' : 'border-border-strong'}`}>
              {active && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
            </span>
            {o.label}
          </label>
        );
      })}
    </div>
  );
}

export function Toggle({ checked, onChange, label, offLabel }: { checked: boolean; onChange: (v: boolean) => void; label: string; offLabel?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="focus-ring inline-flex items-center gap-3 rounded-ctl py-1 text-sm font-medium text-text">
      <span className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-border-strong'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
      {checked ? label : offLabel ?? label}
    </button>
  );
}

/** "+998 (__) ___-__-__" maskali telefon maydoni */
export function PhoneInput({ value, onChange, invalid, id, ...rest }: { value: string; onChange: (v: string) => void; invalid?: boolean; id?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <input
      id={id}
      inputMode="tel"
      className="input tabular"
      aria-invalid={invalid || undefined}
      placeholder="+998 (__) ___-__-__"
      value={value}
      onFocus={(e) => {
        if (!e.target.value) onChange('+998 (');
      }}
      onBlur={(e) => {
        if (e.target.value === '+998 (' || e.target.value === '+998') onChange('');
      }}
      onChange={(e) => {
        const v = e.target.value;
        const f = formatPhone(v);
        onChange(f || (v.startsWith('+998') ? '+998 (' : ''));
      }}
      {...rest}
    />
  );
}

export function PassportInput({ value, onChange, invalid, id }: { value: string; onChange: (v: string) => void; invalid?: boolean; id?: string }) {
  return <input id={id} className="input tabular uppercase" aria-invalid={invalid || undefined} placeholder="AA1234567" value={value} maxLength={9} onChange={(e) => onChange(formatPassport(e.target.value))} />;
}

export function DigitsInput({ value, onChange, length, invalid, id, placeholder }: { value: string; onChange: (v: string) => void; length: number; invalid?: boolean; id?: string; placeholder?: string }) {
  return <input id={id} inputMode="numeric" className="input tabular" aria-invalid={invalid || undefined} placeholder={placeholder} value={value} maxLength={length} onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, length))} />;
}

/** 24 soatlik vaqt maydoni (brauzer locale'iga bog'liq emas) */
export function TimeInput({ value, onChange, id, disabled }: { value: string; onChange: (v: string) => void; id?: string; disabled?: boolean }) {
  return (
    <input
      id={id}
      disabled={disabled}
      inputMode="numeric"
      className="input tabular w-28"
      placeholder="00:00"
      value={value}
      maxLength={5}
      onChange={(e) => {
        const d = e.target.value.replace(/\D/g, '').slice(0, 4);
        let h = d.slice(0, 2);
        if (h.length === 2 && Number(h) > 23) h = '23';
        let m = d.slice(2);
        if (m.length === 2 && Number(m) > 59) m = '59';
        onChange(d.length > 2 ? `${h}:${m}` : h);
      }}
      onBlur={() => {
        const [h = '0', m = '0'] = value.split(':');
        if (value) onChange(`${h.padStart(2, '0')}:${(m || '0').padStart(2, '0')}`);
      }}
    />
  );
}
