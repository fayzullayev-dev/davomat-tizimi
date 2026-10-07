import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { LivePass } from '@/types';
import * as api from '@/services/api';

interface LiveCtx {
  /** Har bir yangi o'tishda oshadi — sahifalar shu orqali ma'lumotni yangilaydi */
  tick: number;
  last: LivePass | null;
}
const Ctx = createContext<LiveCtx>({ tick: 0, last: null });

export function LiveProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LiveCtx>({ tick: 0, last: null });
  useEffect(() => api.subscribeLive((p) => setState((s) => ({ tick: s.tick + 1, last: p }))), []);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}
export const useLive = () => useContext(Ctx);

/** Hozirgi vaqt (har soniyada yangilanadi) */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
