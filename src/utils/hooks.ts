import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as api from '@/services/api';
import type { Structure } from '@/services/api';

/** Asinxron ma'lumot yuklash: yuklanish, xato va qayta yuklash holatlari bilan */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[], opts: { silentDeps?: unknown[] } = {}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const seq = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback((silent = false) => {
    const id = ++seq.current;
    if (!silent) setLoading(true);
    setError(null);
    return fnRef
      .current()
      .then((d) => {
        if (id === seq.current) setData(d);
      })
      .catch((e: Error) => {
        if (id === seq.current && !silent) setError(e);
      })
      .finally(() => {
        if (id === seq.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Jonli yangilanishlar — skeletonsiz, sokin qayta yuklash
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    void run(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, opts.silentDeps ?? []);

  return { data, loading, error, reload: () => run(), refresh: () => run(true), setData };
}

/** Filtrlarni URL query satrida saqlash */
export function useQueryState<T extends Record<string, string>>(defaults: T) {
  const [params, setParams] = useSearchParams();
  const values = { ...defaults } as T;
  for (const k of Object.keys(defaults)) {
    const v = params.get(k);
    if (v !== null) (values as Record<string, string>)[k] = v;
  }
  const set = useCallback(
    (patch: Partial<T>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === undefined || v === '' || v === (defaults as Record<string, string>)[k]) next.delete(k);
            else next.set(k, v as string);
          }
          return next;
        },
        { replace: true },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setParams],
  );
  const reset = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams]);
  return [values, set, reset] as const;
}

let currentTitle = 'Bosh sahifa';
const titleSubs = new Set<(t: string) => void>();
/** Brauzer yorlig'i va sarlavha satridagi sahifa nomini o'rnatadi */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | Davomat tizimi`;
    currentTitle = title;
    titleSubs.forEach((f) => f(title));
  }, [title]);
}
export function usePageTitleValue() {
  const [t, setT] = useState(currentTitle);
  useEffect(() => {
    titleSubs.add(setT);
    return () => {
      titleSubs.delete(setT);
    };
  }, []);
  return t;
}

let structureCache: Structure | null = null;
const structureSubs = new Set<(s: Structure) => void>();
/** Fakultet/kafedra/yo'nalish/guruhlar (keshlangan) */
export function useStructure() {
  const [s, setS] = useState<Structure | null>(structureCache);
  useEffect(() => {
    structureSubs.add(setS);
    if (!structureCache) void reloadStructure();
    return () => {
      structureSubs.delete(setS);
    };
  }, []);
  return s;
}
export async function reloadStructure() {
  try {
    structureCache = await api.getStructure();
    structureSubs.forEach((f) => f(structureCache!));
  } catch {
    /* tarmoq xatosi — keyinroq qayta uriniladi */
  }
}

export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function useSort<K extends string>(initial: K, dir: 'asc' | 'desc' = 'asc') {
  const [sort, setSort] = useState<{ key: K; dir: 'asc' | 'desc' }>({ key: initial, dir });
  const toggle = (key: K) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  return [sort, toggle] as const;
}

let brandLogo: string | null = null;
const brandSubs = new Set<(l: string | null) => void>();
/** Yuklangan universitet logotipi (Sozlamalar → Tizim) */
export function useBrandLogo() {
  const [l, setL] = useState(brandLogo);
  useEffect(() => {
    brandSubs.add(setL);
    return () => {
      brandSubs.delete(setL);
    };
  }, []);
  return l;
}
export function setBrandLogo(l: string | null) {
  brandLogo = l;
  brandSubs.forEach((f) => f(l));
}
