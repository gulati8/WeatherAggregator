import { useState, useEffect, useRef } from 'react';
import { AirportRecord } from '../types/airport';
import { airportsApi } from '../api/client';

const cache = new Map<string, AirportRecord[]>();

export function useAirportSearch(query: string, enabled: boolean) {
  const [results, setResults] = useState<AirportRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!enabled || !query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const key = query.trim().toLowerCase();

    // Check cache
    if (cache.has(key)) {
      setResults(cache.get(key)!);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const data = await airportsApi.search(query.trim());
        cache.set(key, data);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, enabled]);

  return { results, loading };
}
