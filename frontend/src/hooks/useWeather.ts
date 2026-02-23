import { useState, useEffect, useCallback } from 'react';
import { weatherApi, favoritesApi, preferencesApi } from '../api/client';
import { UnifiedWeatherData } from '../types/weather';
import { useAuth } from '../contexts/AuthContext';

interface UseWeatherResult {
  data: UnifiedWeatherData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useWeather(
  icao: string | undefined,
  targetTime?: Date | null
): UseWeatherResult {
  const [data, setData] = useState<UnifiedWeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(
    async (forceRefresh = false) => {
      if (!icao) {
        setData(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await weatherApi.getWeather(icao, {
          refresh: forceRefresh,
          targetTime: targetTime || undefined,
        });
        setData(result);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to fetch weather data';
        setError(message);
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [icao, targetTime]
  );

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  const refresh = useCallback(async () => {
    await fetchWeather(true);
  }, [fetchWeather]);

  return { data, loading, error, refresh };
}

const FAVORITES_KEY = 'weather-aggregator-favorites';
const RECENT_KEY = 'weather-aggregator-recent';
const MAX_RECENT = 10;

function getStoredArray(key: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Hook for managing favorites — uses API when authenticated, localStorage when not
export function useFavorites() {
  const { isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  useEffect(() => {
    const load = async () => {
      if (isAuthenticated) {
        try {
          const serverFavs = await favoritesApi.getAll();
          setFavorites(serverFavs);
        } catch {
          setFavorites(getStoredArray(FAVORITES_KEY));
        }
      } else {
        setFavorites(getStoredArray(FAVORITES_KEY));
      }
    };
    load();
  }, [isAuthenticated]);

  const addFavorite = useCallback(async (icao: string) => {
    const normalized = icao.toUpperCase();
    setFavorites((prev) => {
      const updated = [...new Set([...prev, normalized])];
      if (!isAuthenticated) {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      }
      return updated;
    });

    if (isAuthenticated) {
      try {
        await favoritesApi.add(normalized);
      } catch {
        // Revert on failure would be complex; keep optimistic update
      }
    }
  }, [isAuthenticated]);

  const removeFavorite = useCallback(async (icao: string) => {
    const normalized = icao.toUpperCase();
    setFavorites((prev) => {
      const updated = prev.filter((f) => f !== normalized);
      if (!isAuthenticated) {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      }
      return updated;
    });

    if (isAuthenticated) {
      try {
        await favoritesApi.remove(normalized);
      } catch {
        // Keep optimistic update
      }
    }
  }, [isAuthenticated]);

  const isFavorite = useCallback(
    (icao: string) => favorites.includes(icao.toUpperCase()),
    [favorites]
  );

  return { favorites, addFavorite, removeFavorite, isFavorite };
}

// Hook for recent searches — uses API when authenticated, localStorage when not
export function useRecentSearches() {
  const { isAuthenticated } = useAuth();
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      if (isAuthenticated) {
        try {
          const prefs = await preferencesApi.get();
          setRecent((prefs.recentSearches as string[]) || []);
        } catch {
          setRecent(getStoredArray(RECENT_KEY));
        }
      } else {
        setRecent(getStoredArray(RECENT_KEY));
      }
    };
    load();
  }, [isAuthenticated]);

  const addRecent = useCallback(async (icao: string) => {
    const normalized = icao.toUpperCase();
    setRecent((prev) => {
      const filtered = prev.filter((r) => r !== normalized);
      const updated = [normalized, ...filtered].slice(0, MAX_RECENT);
      if (!isAuthenticated) {
        localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
      }
      return updated;
    });

    if (isAuthenticated) {
      try {
        // Debounce server update by just calling with current state
        setRecent((current) => {
          preferencesApi.update({ recentSearches: current }).catch(() => {});
          return current;
        });
      } catch {
        // Non-critical
      }
    }
  }, [isAuthenticated]);

  const clearRecent = useCallback(async () => {
    setRecent([]);
    if (isAuthenticated) {
      try {
        await preferencesApi.update({ recentSearches: [] });
      } catch {
        // Non-critical
      }
    } else {
      localStorage.removeItem(RECENT_KEY);
    }
  }, [isAuthenticated]);

  return { recent, addRecent, clearRecent };
}
