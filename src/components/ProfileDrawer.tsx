import { useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import type { AttendanceRow, Student, Teacher } from '@/types';
import { formatFullDate } from '@/utils/date';
import { COURSE_LABELS, fullName } from '@/utils/format';
import { useStructure } from '@/utils/hooks';
import { Drawer } from './ui/Modal';
import { Avatar, Pill, StatusBadge } from './ui/Badge';
import { Button } from './ui/Button';
import { ArrivalCell, DepartureCell, ReasonBadge, WorkedCell } from './AttendanceBits';

type Row = AttendanceRow & { person: Teacher | Student };

export function ProfileDrawer({ row, onClose }: { row: Row | null; onClose: () => void }) {
  const nav = useNavigate();
  const st = useStructure();
  if (!row) return null;
  const isT = row.personType === 'teacher';
  const p = row.person;
  const t = p as Teacher;
  const s = p as Student;
  const dep = st?.departments.find((d) => d.id === p.departmentId)?.name ?? '—';
  const group = !isT ? st?.groups.find((g) => g.id === s.groupId)?.name : null;
  const dir = !isT ? st?.directions.find((d) => d.id === s.directionId)?.name : null;
  const info: [string, React.ReactNode][] = isT
    ? [
        ['Lavozimi', t.position],
        ['Kafedra', dep],
        ['Telefon raqami', <span className="tabular">{t.phone}</span>],
        ['Turniket ID', t.turnstileId ? <Pill tone="primary">{t.turnstileId}</Pill> : <Pill tone="warning">Biriktirilmagan</Pill>],
      ]
    : [
        ['Guruh', <Pill tone="neutral">{group}</Pill>],
        ["Yo'nalish", dir],
        ['Kurs', COURSE_LABELS[s.course]],
        ['Telefon raqami', <span className="tabular">{s.phone}</span>],
        ['Ota-ona telefoni', <span className="tabular">{s.parents[0]?.phone ?? '—'}</span>],
        ['Turniket ID', <Pill tone="primary">{s.turnstileId}</Pill>],
      ];
  const href = `${isT ? '/oqituvchilar' : '/talabalar'}/${p.id}`;
  return (
    <Drawer
      open={!!row}
      onClose={onClose}
      title={isT ? "O'qituvchi" : 'Talaba'}
      footer={
        <Button className="w-full" icon={<ExternalLink size={16} />} onClick={() => nav(href)}>
          To'liq profilni ochish
        </Button>
      }
    >
      <div className="flex flex-col items-center text-center">
        <Avatar name={fullName(p)} photo={p.photo} size={84} />
        <h3 className="mt-3 text-lg font-bold text-text">{fullName(p)}</h3>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">{isT ? t.position : `Talaba ID: ${s.studentId}`}</p>
      </div>
      <div className="mt-6 rounded-card bg-surface-2 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-muted">{formatFullDate(row.date)}</span>
          <div className="flex items-center gap-1.5">
            <StatusBadge status={row.status} />
            <ReasonBadge reason={row.reason} />
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted">Kelgan vaqti</dt>
            <dd className="mt-1">
              <ArrivalCell row={row} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Ketgan vaqti</dt>
            <dd className="mt-1">
              <DepartureCell row={row} />
            </dd>
          </div>
          {isT && (
            <div className="col-span-2">
              <dt className="text-xs text-muted">Ishlagan vaqti</dt>
              <dd className="mt-1">
                <WorkedCell row={row} />
              </dd>
            </div>
          )}
        </dl>
      </div>
      <dl className="mt-5 divide-y divide-border">
        {info.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 py-3 text-sm">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right font-medium text-text">{v}</dd>
          </div>
        ))}
      </dl>
    </Drawer>
  );
}
