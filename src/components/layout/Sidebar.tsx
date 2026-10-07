import { NavLink } from 'react-router-dom';
import {
  BookUser, Building2, ChevronsLeft, ChevronsRight, FileBarChart, GraduationCap, LayoutDashboard, LogOut, Settings, UserCheck, Users, X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS } from '@/utils/format';
import { Avatar, Pill } from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
import { Logo } from './Logo';

interface Item {
  to: string;
  label: string;
  icon: ReactNode;
}
const GROUPS: { title: string; items: Item[] }[] = [
  { title: 'Asosiy', items: [{ to: '/', label: 'Bosh sahifa', icon: <LayoutDashboard size={19} /> }] },
  {
    title: 'Davomat monitoringi',
    items: [
      { to: '/oqituvchilar-davomati', label: "O'qituvchilar davomati", icon: <UserCheck size={19} /> },
      { to: '/talabalar-davomati', label: 'Talabalar davomati', icon: <GraduationCap size={19} /> },
    ],
  },
  {
    title: "Ma'lumotlar bazasi",
    items: [
      { to: '/oqituvchilar', label: "O'qituvchilar", icon: <Users size={19} /> },
      { to: '/talabalar', label: 'Talabalar', icon: <BookUser size={19} /> },
      { to: '/tuzilma', label: 'Fakultet va kafedralar', icon: <Building2 size={19} /> },
    ],
  },
  {
    title: 'Hisobot va boshqaruv',
    items: [
      { to: '/hisobotlar', label: 'Hisobotlar', icon: <FileBarChart size={19} /> },
      { to: '/sozlamalar', label: 'Sozlamalar', icon: <Settings size={19} /> },
    ],
  },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onLogout: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose, onLogout }: Props) {
  const { user } = useAuth();
  const content = (mini: boolean, mobile: boolean) => (
    <div className="flex h-full flex-col">
      <div className={`flex h-[72px] shrink-0 items-center gap-3 ${mini ? 'justify-center px-2' : 'px-5'}`}>
        <Logo size={40} />
        {!mini && (
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-bold leading-tight text-text">Davomat tizimi</div>
            <div className="text-xs text-muted">Universitet</div>
          </div>
        )}
        {mobile && (
          <button onClick={onMobileClose} aria-label="Menyuni yopish" title="Menyuni yopish" className="focus-ring rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-text">
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Asosiy menyu">
        {GROUPS.map((g) => (
          <div key={g.title} className="mt-4 first:mt-2">
            {mini ? <div className="mx-auto mb-2 h-px w-8 bg-border" /> : <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{g.title}</div>}
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const link = (
                  <NavLink
                    to={it.to}
                    end={it.to === '/'}
                    onClick={mobile ? onMobileClose : undefined}
                    aria-label={mini ? it.label : undefined}
                    className={({ isActive }) =>
                      `focus-ring relative flex items-center gap-3 rounded-ctl py-2.5 text-sm font-medium transition-colors ${mini ? 'justify-center px-0' : 'px-3'} ${
                        isActive ? 'bg-primary-soft text-primary-ink before:absolute before:-left-3 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r-full before:bg-primary' : 'text-muted hover:bg-surface-2 hover:text-text'
                      }`
                    }
                  >
                    {it.icon}
                    {!mini && <span className="truncate">{it.label}</span>}
                  </NavLink>
                );
                return (
                  <li key={it.to}>
                    {mini ? (
                      <Tooltip content={it.label} side="right">
                        {link}
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border p-3">
        {user && (
          <div className={`mb-2 flex items-center gap-3 rounded-ctl bg-surface-2 p-2.5 ${mini ? 'justify-center' : ''}`}>
            <Avatar name={user.fullName} size={36} />
            {!mini && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-text">{user.fullName.split(' ').slice(0, 2).join(' ')}</div>
                <Pill tone="primary" className="mt-0.5 !px-2 !py-0 text-[10px]">
                  {ROLE_LABELS[user.role]}
                </Pill>
              </div>
            )}
          </div>
        )}
        <div className={`flex gap-1 ${mini ? 'flex-col items-center' : ''}`}>
          <Tooltip content={mini ? 'Chiqish' : ''} side="right">
            <button onClick={onLogout} aria-label="Chiqish" className={`focus-ring flex items-center gap-2 rounded-ctl py-2 text-sm font-medium text-muted transition-colors hover:bg-danger-soft hover:text-danger-ink ${mini ? 'justify-center px-2.5' : 'flex-1 px-3'}`}>
              <LogOut size={18} />
              {!mini && 'Chiqish'}
            </button>
          </Tooltip>
          {!mobile && (
            <Tooltip content={collapsed ? 'Menyuni yoyish' : "Menyuni yig'ish"} side="right">
              <button onClick={onToggle} aria-label={collapsed ? 'Menyuni yoyish' : "Menyuni yig'ish"} className="focus-ring grid h-9 w-9 place-items-center rounded-ctl text-muted hover:bg-surface-2 hover:text-text">
                {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
              </button>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={`no-print fixed inset-y-0 left-0 z-30 hidden border-r border-border bg-surface transition-[width] duration-200 lg:block ${collapsed ? 'w-20' : 'w-[260px]'}`}
      >
        {content(collapsed, false)}
      </aside>
      {mobileOpen && (
        <div className="no-print fixed inset-0 z-[70] lg:hidden">
          <div className="anim-fade absolute inset-0 bg-overlay" onClick={onMobileClose} />
          <aside className="anim-drawer-left absolute inset-y-0 left-0 w-[280px] max-w-[85vw] border-r border-border bg-surface">{content(false, true)}</aside>
        </div>
      )}
    </>
  );
}
