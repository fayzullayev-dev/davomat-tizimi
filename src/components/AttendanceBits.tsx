import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Phone, Timer } from 'lucide-react';
import type { AbsenceReason, AttendanceRow, Parent, PersonType } from '@/types';
import { formatDuration, formatTime } from '@/utils/date';
import { useNow } from '@/context/LiveContext';
import { useToast } from '@/context/ToastContext';
import * as api from '@/services/api';
import { Pill, StatusBadge } from './ui/Badge';
import { Tooltip } from './ui/Tooltip';
import { Modal } from './ui/Modal';
import { Button, IconButton } from './ui/Button';
import { Field, RadioGroup, Textarea } from './ui/Form';

/** KELGAN VAQTI ustuni: yashil pill + kechikkan bo'lsa "KECHIKDI" */
export function ArrivalCell({ row }: { row: AttendanceRow }) {
  if (!row.arrival) return <span className="text-muted">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Pill tone="primary">{formatTime(row.arrival)}</Pill>
      {row.status === 'kechikdi' && (
        <Tooltip content={`${row.lateMinutes} daqiqaga kechikdi`}>
          <span tabIndex={0} className="pill cursor-help bg-warning-soft text-[10px] uppercase tracking-wider text-warning-ink">
            Kechikdi
          </span>
        </Tooltip>
      )}
    </span>
  );
}

/** KETGAN VAQTI ustuni */
export function DepartureCell({ row }: { row: AttendanceRow }) {
  if (row.inside)
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="text-muted">—</span>
        <StatusBadge status="binoda" />
      </span>
    );
  if (!row.departure) return <span className="text-muted">—</span>;
  return <Pill tone="neutral">{formatTime(row.departure)}</Pill>;
}

export function liveWorked(row: AttendanceRow, now: Date) {
  return row.workedMinutes + (row.openSince ? (now.getTime() - new Date(row.openSince).getTime()) / 60000 : 0);
}

/** ISHLAGAN VAQTI ustuni (binoda bo'lsa jonli yangilanadi) */
export function WorkedCell({ row }: { row: AttendanceRow }) {
  const now = useNow(30000);
  if (!row.arrival) return <span className="text-muted">—</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Pill tone={row.inside ? 'info' : 'neutral'} icon={<Timer size={12} />}>
        {formatDuration(liveWorked(row, now))}
      </Pill>
      {row.inside && <span className="text-[11px] text-muted">(davom etmoqda)</span>}
    </span>
  );
}

export function RowStatus({ row }: { row: AttendanceRow }) {
  return <StatusBadge status={row.status} />;
}

/** "Ota-ona raqami" popover'i */
export function ParentPhoneButton({ parents, compact }: { parents: Parent[]; compact?: boolean }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const toast = useToast();
  useEffect(() => {
    if (!pos) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPos(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pos]);
  const label = compact ? "Ota-onaga qo'ng'iroq" : 'Ota-ona raqami';
  return (
    <>
      <IconButton
        label={label}
        size="sm"
        tone="primary"
        onClick={(e) => {
          e.stopPropagation();
          const r = e.currentTarget.getBoundingClientRect();
          setPos(pos ? null : { x: Math.min(r.right, window.innerWidth - 8), y: r.bottom });
        }}
      >
        <Phone size={15} />
      </IconButton>
      {pos &&
        createPortal(
          <div className="fixed inset-0 z-[85]" onClick={() => setPos(null)}>
            <div
              className="anim-pop fixed w-72 rounded-card border border-border bg-surface p-4 shadow-pop"
              style={{ left: pos.x, top: pos.y + 6, transform: 'translateX(-100%)' }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="Ota-ona raqami"
            >
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Ota-ona raqami</div>
              <div className="space-y-3">
                {parents.map((p, i) => (
                  <div key={i}>
                    <div className="text-sm font-semibold text-text">{p.fullName}</div>
                    <div className="text-xs text-muted">{p.relation}</div>
                    {[p.phone, p.phone2].filter(Boolean).map((ph) => (
                      <div key={ph} className="mt-1.5 flex items-center gap-2">
                        <a href={`tel:${ph.replace(/[^\d+]/g, '')}`} className="flex-1 text-sm font-semibold text-primary-ink tabular hover:underline">
                          {ph}
                        </a>
                        <Button
                          size="sm"
                          variant="outline"
                          icon={<Copy size={13} />}
                          onClick={() => {
                            void navigator.clipboard?.writeText(ph).catch(() => undefined);
                            toast.success('Nusxa olindi');
                          }}
                        >
                          Nusxa olish
                        </Button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/** "Kelmaslik sababi" modali (Kadrlar bo'limi va Superadmin) */
export function ReasonModal({ open, onClose, type, personId, date, initial, onSaved }: { open: boolean; onClose: () => void; type: PersonType; personId: string; date: string; initial: AbsenceReason | null; onSaved: () => void }) {
  const [kind, setKind] = useState<'sababli' | 'sababsiz' | ''>(initial?.type ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  useEffect(() => {
    if (open) {
      setKind(initial?.type ?? '');
      setNote(initial?.note ?? '');
      setErr('');
    }
  }, [open, initial]);
  const save = async () => {
    if (!kind) {
      setErr("Bu maydon to'ldirilishi shart");
      return;
    }
    setBusy(true);
    try {
      await api.setAbsenceReason(type, personId, date, { type: kind, note });
      toast.success('Saqlandi');
      onSaved();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const dirty = kind !== (initial?.type ?? '') || note !== (initial?.note ?? '');
  return (
    <Modal
      open={open}
      onClose={onClose}
      dirty={dirty}
      title="Kelmaslik sababi"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button onClick={save} loading={busy}>
            Saqlash
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Sabab turi" required error={err}>
          <RadioGroup
            value={kind}
            onChange={(v) => {
              setKind(v);
              setErr('');
            }}
            invalid={!!err}
            options={[
              { value: 'sababli', label: 'Sababli' },
              { value: 'sababsiz', label: 'Sababsiz' },
            ]}
          />
        </Field>
        <Field label="Izoh" htmlFor="reason-note">
          <Textarea id="reason-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Masalan: kasallik varaqasi" />
        </Field>
      </div>
    </Modal>
  );
}

export function ReasonBadge({ reason }: { reason: AbsenceReason | null }) {
  if (!reason) return null;
  return (
    <Tooltip content={reason.note || (reason.type === 'sababli' ? 'Sababli' : 'Sababsiz')}>
      <span tabIndex={0}>
        <Pill tone={reason.type === 'sababli' ? 'info' : 'danger'}>{reason.type === 'sababli' ? 'Sababli' : 'Sababsiz'}</Pill>
      </span>
    </Tooltip>
  );
}
