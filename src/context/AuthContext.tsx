import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@/types';
import * as api from '@/services/api';
import { can, type Permission } from '@/utils/permissions';

interface AuthCtx {
  user: User | null;
  login: (login: string, password: string, remember: boolean) => Promise<void>;
  logout: () => void;
  can: (p: Permission) => boolean;
}
const Ctx = createContext<AuthCtx>(null!);
const KEY = 'dt-user';

function restore(): User | null {
  try {
    const raw = localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(restore);

  const login = useCallback(async (l: string, p: string, remember: boolean) => {
    const u = await api.login(l, p);
    try {
      (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(u));
    } catch {
      /* saqlab bo'lmadi */
    }
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
      sessionStorage.removeItem(KEY);
    } catch {
      /* e'tiborsiz */
    }
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, logout, can: (p: Permission) => can(user?.role, p) }), [user, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
