import { useRef, useState, type ReactNode } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { REGIONS } from '@/utils/format';
import { Button } from './ui/Button';
import { Field, Input, Select } from './ui/Form';

export function FormSection({ title, icon, children, cols = 3 }: { title: string; icon?: ReactNode; children: ReactNode; cols?: 2 | 3 }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="mb-5 flex items-center gap-2.5 text-base font-semibold text-text">
        {icon && <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary-ink">{icon}</span>}
        {title}
      </h2>
      <div className={`grid gap-4 sm:grid-cols-2 ${cols === 3 ? 'lg:grid-cols-3' : ''}`}>{children}</div>
    </section>
  );
}

export function PhotoUpload({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState('');
  const pick = (f?: File) => {
    if (!f) return;
    if (!/image\/(jpe?g|png)/.test(f.type)) return setErr('Faqat JPG yoki PNG rasm yuklash mumkin');
    if (f.size > 2 * 1024 * 1024) return setErr('Rasm hajmi 2 MB dan oshmasligi kerak');
    setErr('');
    const r = new FileReader();
    r.onload = () => onChange(String(r.result));
    r.readAsDataURL(f);
  };
  return (
    <div className="flex items-center gap-5 sm:col-span-2 lg:col-span-3">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        aria-label="Rasm yuklash"
        className="focus-ring group relative grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-dashed border-border-strong bg-surface-2 text-muted transition-colors hover:border-primary hover:text-primary-ink"
      >
        {value ? (
          <img src={value} alt="Rasm" className="h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-xs font-medium">
            <Camera size={24} />
            Rasm yuklash
          </span>
        )}
      </button>
      <div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" icon={<Camera size={14} />} onClick={() => ref.current?.click()}>
            Rasm yuklash
          </Button>
          {value && (
            <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => onChange(null)} className="!text-danger-ink hover:!bg-danger-soft">
              O'chirish
            </Button>
          )}
        </div>
        <p className={`mt-2 text-xs ${err ? 'font-medium text-danger-ink' : 'text-muted'}`}>{err || 'JPG yoki PNG, 2 MB gacha'}</p>
      </div>
      <input ref={ref} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}

export function AddressFields({ v, set, err, required = true }: { v: { region: string; district: string; address: string }; set: (k: 'region' | 'district' | 'address', val: string) => void; err: Record<string, string>; required?: boolean }) {
  return (
    <>
      <Field label="Viloyat" required={required} error={err.region} htmlFor="f-region" name="region">
        <Select id="f-region" value={v.region} invalid={!!err.region} onChange={(e) => set('region', e.target.value)} placeholder="Viloyatni tanlang" options={REGIONS.map((r) => ({ value: r, label: r }))} />
      </Field>
      <Field label="Tuman / shahar" required={required} error={err.district} htmlFor="f-district" name="district">
        <Input id="f-district" value={v.district} invalid={!!err.district} onChange={(e) => set('district', e.target.value)} placeholder="Tuman yoki shahar nomi" />
      </Field>
      <Field label="Manzil" required={required} error={err.address} htmlFor="f-address" name="address">
        <Input id="f-address" value={v.address} invalid={!!err.address} onChange={(e) => set('address', e.target.value)} placeholder="Ko'cha, uy, xonadon" />
      </Field>
    </>
  );
}

export function StickyBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-border px-4 py-3 sm:-mx-6 sm:px-6" style={{ background: 'color-mix(in srgb, var(--surface) 94%, transparent)', backdropFilter: 'blur(8px)' }}>
      <div className="flex flex-wrap justify-end gap-2">{children}</div>
    </div>
  );
}

/** Birinchi xatoli maydonga aylantirish */
export function scrollToFirstError(errors: Record<string, string>, order: string[]) {
  const first = order.find((k) => errors[k]) ?? Object.keys(errors)[0];
  if (!first) return;
  const el = document.querySelector<HTMLElement>(`[data-field="${first}"]`);
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => el?.querySelector<HTMLElement>('input,select,textarea,button')?.focus({ preventScroll: true }), 350);
}
