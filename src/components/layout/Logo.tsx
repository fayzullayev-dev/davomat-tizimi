import { useBrandLogo } from '@/utils/hooks';

/** Universitet logotipi (yuklanmagan bo'lsa — turniket/soat belgisi) */
export function Logo({ size = 40, inverted = false }: { size?: number; inverted?: boolean }) {
  const custom = useBrandLogo();
  if (custom) return <img src={custom} alt="Logotip" className="shrink-0 rounded-xl object-contain" style={{ width: size, height: size }} />;
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-xl ${inverted ? 'bg-white/15 text-white ring-1 ring-white/30' : 'bg-primary text-primary-fg'}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
        <path d="M3.5 9h3M17.5 9h3" opacity="0.6" />
      </svg>
    </span>
  );
}
