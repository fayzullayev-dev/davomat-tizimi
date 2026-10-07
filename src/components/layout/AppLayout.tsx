import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { LiveProvider } from '@/context/LiveContext';
import * as api from '@/services/api';
import { ConfirmModal } from '@/components/ui/Modal';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

function useOffline() {
  const [off, setOff] = useState(() => !navigator.onLine || api.isOfflineMode());
  useEffect(() => {
    const upd = () => setOff(!navigator.onLine || api.isOfflineMode());
    window.addEventListener('online', upd);
    window.addEventListener('offline', upd);
    const un = api.onNetworkChange(upd);
    return () => {
      window.removeEventListener('online', upd);
      window.removeEventListener('offline', upd);
      un();
    };
  }, []);
  return off;
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const nav = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('dt-sidebar') === 'mini';
    } catch {
      return false;
    }
  });
  const [mobile, setMobile] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const offline = useOffline();

  useEffect(() => {
    try {
      localStorage.setItem('dt-sidebar', collapsed ? 'mini' : 'full');
    } catch {
      /* e'tiborsiz */
    }
  }, [collapsed]);

  if (!user) return <Navigate to="/kirish" replace state={{ from: location.pathname + location.search }} />;

  return (
    <LiveProvider>
      <div className="min-h-screen bg-bg">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} mobileOpen={mobile} onMobileClose={() => setMobile(false)} onLogout={() => setConfirmLogout(true)} />
        <div className={`print-main transition-[margin] duration-200 ${collapsed ? 'lg:ml-20' : 'lg:ml-[260px]'}`}>
          {offline && (
            <div role="alert" className="no-print relative z-40 flex items-center justify-center gap-2 bg-danger px-4 py-2 text-sm font-semibold text-danger-fg">
              <WifiOff size={16} />
              Internet aloqasi yo'q
            </div>
          )}
          <Header onMenu={() => setMobile(true)} onLogout={() => setConfirmLogout(true)} />
          <main className="print-main mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6">
            <Outlet />
          </main>
        </div>
        <ConfirmModal
          open={confirmLogout}
          onClose={() => setConfirmLogout(false)}
          onConfirm={() => {
            setConfirmLogout(false);
            logout();
            nav('/kirish', { replace: true });
          }}
          title="Tizimdan chiqmoqchimisiz?"
          confirmText="Chiqish"
          danger
        />
      </div>
    </LiveProvider>
  );
}
