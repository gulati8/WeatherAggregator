import { useState, useEffect, useCallback, useRef } from 'react';
import { preferencesApi } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export function useDarkMode(): [boolean, () => void] {
  const { isAuthenticated } = useAuth();
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('weather-aggregator-dark-mode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('weather-aggregator-dark-mode', String(isDark));
  }, [isDark]);

  // Sync to server when authenticated (debounced)
  const syncToServer = useCallback((value: boolean) => {
    if (!isAuthenticated) return;

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = setTimeout(() => {
      preferencesApi.update({ darkMode: value }).catch(() => {});
    }, 1000);
  }, [isAuthenticated]);

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      syncToServer(next);
      return next;
    });
  }, [syncToServer]);

  return [isDark, toggle];
}
