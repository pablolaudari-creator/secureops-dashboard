import { useState, useEffect, useCallback, useRef } from 'react';

// ─── localStorage hook ───────────────────────────────────────────────────────
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(`spi_sgc_${key}`);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const set = useCallback((v: T | ((prev: T) => T)) => {
    setValue(prev => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
      try { localStorage.setItem(`spi_sgc_${key}`, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  }, [key]);

  return [value, set] as const;
}

// ─── Live clock hook ─────────────────────────────────────────────────────────
export function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ─── Countdown hook ───────────────────────────────────────────────────────────
export function useCountdown(targetDate: string) {
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setDays(0); setHours(0); setMinutes(0); setSeconds(0); return; }
      setDays(Math.floor(diff / 86400000));
      setHours(Math.floor((diff % 86400000) / 3600000));
      setMinutes(Math.floor((diff % 3600000) / 60000));
      setSeconds(Math.floor((diff % 60000) / 1000));
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return { days, hours, minutes, seconds };
}

// ─── Online status hook ───────────────────────────────────────────────────────
export function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

// ─── Toast hook ───────────────────────────────────────────────────────────────
export interface Toast {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { ...t, id }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 5500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(x => x.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

// ─── Auto-refresh hook ────────────────────────────────────────────────────────
export function useAutoRefresh(callback: () => void, intervalMs: number) {
  const [refreshing, setRefreshing] = useState(false);
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    const id = setInterval(async () => {
      setRefreshing(true);
      await cbRef.current();
      setTimeout(() => setRefreshing(false), 1200);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return refreshing;
}

// ─── Sparkline data generator (4 weeks trend) ────────────────────────────────
export function generateSparkline(baseValue: number, weeks = 6): number[] {
  const result: number[] = [];
  let val = Math.max(0, baseValue - 10 + Math.random() * 5);
  for (let i = 0; i < weeks; i++) {
    val = Math.min(100, Math.max(0, val + (Math.random() * 6 - 2)));
    result.push(Math.round(val));
  }
  result[result.length - 1] = baseValue;
  return result;
}

// ─── Print export ─────────────────────────────────────────────────────────────
export function triggerPrint() {
  window.print();
}
