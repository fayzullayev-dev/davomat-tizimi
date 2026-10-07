import type { ReactNode } from 'react';
import type { AttendanceStatus, PersonType } from '@/types';
import { initials } from '@/utils/format';

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';
const TONES: Record<Tone, string> = {
  success: 'bg-success-soft text-success-ink',
  warning: 'bg-warning-soft text-warning-ink',
  danger: 'bg-danger-soft text-danger-ink',
  info: 'bg-info-soft text-info-ink',
  neutral: 'bg-neutral-soft text-neutral-ink',
  primary: 'bg-primary-soft text-primary-ink',
};

export function Pill({ tone = 'neutral', children, className = '', icon }: { tone?: Tone; children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <span className={`pill ${TONES[tone]} ${className}`}>
      {icon}
      {children}
    </span>
  );
}

export const STATUS_LABEL: Record<AttendanceStatus | 'binoda', string> = {
  keldi: 'Keldi',
  kechikdi: 'Kechikdi',
  kelmadi: 'Kelmadi',
  binoda: 'Binoda',
  dam: 'Dam olish kuni',
  kelajak: '—',
};
const STATUS_TONE: Record<AttendanceStatus | 'binoda', Tone> = {
  keldi: 'success',
  kechikdi: 'warning',
  kelmadi: 'danger',
  binoda: 'info',
  dam: 'neutral',
  kelajak: 'neutral',
};

export function StatusBadge({ status, upper }: { status: AttendanceStatus | 'binoda'; upper?: boolean }) {
  return (
    <Pill tone={STATUS_TONE[status]} className={upper ? 'text-[10px] uppercase tracking-wider' : ''}>
      {status === 'binoda' && <span className="pulse-dot !h-1.5 !w-1.5" />}
      {STATUS_LABEL[status]}
    </Pill>
  );
}

export function TypeBadge({ type }: { type: PersonType }) {
  return type === 'teacher' ? <Pill tone="primary">O'qituvchi</Pill> : <Pill tone="info">Talaba</Pill>;
}

export function Avatar({ name, photo, size = 36 }: { name: string; photo?: string | null; size?: number }) {
  if (photo) return <img src={photo} alt={name} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  return (
    <span
      aria-hidden="true"
      className="inline-grid shrink-0 place-items-center rounded-full bg-primary font-semibold text-primary-fg"
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.36) }}
    >
      {initials(name)}
    </span>
  );
}
