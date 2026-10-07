import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemePref = 'light' | 'dark' | 'system';
export type Density = 'normal' | 'compact';

interface ThemeCtx {
  pref: ThemePref;
  resolved: 'light' | 'dark';
  setPref: (p: ThemePref) => void;
  toggle: () => void;
  density: Density;
  setDensity: (d: Density) => void;
}
const Ctx = createContext<ThemeCtx>(null!);

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* saqlab bo'lmadi */
  }
};
const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(() => (read('dt-theme') as ThemePref) || 'system');
  const [sysDark, setSysDark] = useState(systemDark);
  const [density, setDensityState] = useState<Density>(() => (read('dt-density') as Density) || 'normal');
  const resolved = pref === 'system' ? (sysDark ? 'dark' : 'light') : pref;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const fn = () => setSysDark(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (root.getAttribute('data-theme') === resolved) return;
    root.classList.add('theme-transition');
    root.setAttribute('data-theme', resolved);
    const t = setTimeout(() => root.classList.remove('theme-transition'), 250);
    return () => clearTimeout(t);
  }, [resolved]);

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density === 'compact' ? 'compact' : 'normal');
  }, [density]);

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p);
    write('dt-theme', p);
  }, []);
  const toggle = useCallback(() => setPref(resolved === 'dark' ? 'light' : 'dark'), [resolved, setPref]);
  const setDensity = useCallback((d: Density) => {
    setDensityState(d);
    write('dt-density', d);
  }, []);

  const value = useMemo(() => ({ pref, resolved, setPref, toggle, density, setDensity }), [pref, resolved, setPref, toggle, density, setDensity]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useTheme = () => useContext(Ctx);

/** Grafiklar uchun ranglar (SVG atributlari uchun aniq hex qiymatlar) */
export function useChartColors() {
  const { resolved } = useTheme();
  return resolved === 'dark'
    ? { keldi: '#22B35E', binoda: '#2DD4BF', kechikdi: '#FBBF24', kelmadi: '#FB7185', neutral: '#94A3B8', grid: '#2A3A31', axis: '#9AABA1', text: '#E8F0EB', surface: '#16201B', primary: '#22B35E' }
    : { keldi: '#00873A', binoda: '#14B8A6', kechikdi: '#F59E0B', kelmadi: '#F43F5E', neutral: '#94A3B8', grid: '#E3EAE5', axis: '#5F6F66', text: '#14201A', surface: '#FFFFFF', primary: '#00873A' };
}
