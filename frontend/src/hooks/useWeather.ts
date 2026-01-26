import { useState, useEffect, useCallback } from 'react';
import { weatherApi } from '../api/client';
import { UnifiedWeatherData } from '../types/weather';

interface UseWeatherResult {
  data: UnifiedWeatherData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useWeather(icao: string | undefined): UseWeatherResult {
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
        const result = await weatherApi.getWeather(icao, forceRefresh);
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
    [icao]
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

// Hook for managing favorites in localStorage
export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    setFavorites(getStoredArray(FAVORITES_KEY));
  }, []);

  const addFavorite = useCallback((icao: string) => {
    setFavorites((prev) => {
      const updated = [...new Set([...prev, icao.toUpperCase()])];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeFavorite = useCallback((icao: string) => {
    setFavorites((prev) => {
      const updated = prev.filter((f) => f !== icao.toUpperCase());
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isFavorite = useCallback(
    (icao: string) => favorites.includes(icao.toUpperCase()),
    [favorites]
  );

  return { favorites, addFavorite, removeFavorite, isFavorite };
}

// Hook for recent searches
export function useRecentSearches() {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setRecent(getStoredArray(RECENT_KEY));
  }, []);

  const addRecent = useCallback((icao: string) => {
    setRecent((prev) => {
      const normalized = icao.toUpperCase();
      const filtered = prev.filter((r) => r !== normalized);
      const updated = [normalized, ...filtered].slice(0, MAX_RECENT);
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearRecent = useCallback(() => {
    setRecent([]);
    localStorage.removeItem(RECENT_KEY);
  }, []);

  return { recent, addRecent, clearRecent };
}
