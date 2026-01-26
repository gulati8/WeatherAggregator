import NodeCache from 'node-cache';
import { config } from '../config';

class CacheService {
  private cache: NodeCache;

  constructor() {
    this.cache = new NodeCache({
      checkperiod: 60, // Check for expired keys every 60 seconds
    });
  }

  get<T>(key: string): T | undefined {
    return this.cache.get<T>(key);
  }

  set<T>(key: string, value: T, ttlSeconds?: number): boolean {
    if (ttlSeconds) {
      return this.cache.set(key, value, ttlSeconds);
    }
    return this.cache.set(key, value);
  }

  del(key: string): number {
    return this.cache.del(key);
  }

  flush(): void {
    this.cache.flushAll();
  }

  // Convenience methods with default TTLs
  setMetar<T>(icao: string, value: T): boolean {
    return this.set(`metar:${icao.toUpperCase()}`, value, config.cache.metarTtl);
  }

  getMetar<T>(icao: string): T | undefined {
    return this.get<T>(`metar:${icao.toUpperCase()}`);
  }

  setTaf<T>(icao: string, value: T): boolean {
    return this.set(`taf:${icao.toUpperCase()}`, value, config.cache.tafTtl);
  }

  getTaf<T>(icao: string): T | undefined {
    return this.get<T>(`taf:${icao.toUpperCase()}`);
  }

  setAirport<T>(icao: string, value: T): boolean {
    return this.set(`airport:${icao.toUpperCase()}`, value, config.cache.airportTtl);
  }

  getAirport<T>(icao: string): T | undefined {
    return this.get<T>(`airport:${icao.toUpperCase()}`);
  }

  setWeather<T>(icao: string, value: T): boolean {
    return this.set(`weather:${icao.toUpperCase()}`, value, config.cache.metarTtl);
  }

  getWeather<T>(icao: string): T | undefined {
    return this.get<T>(`weather:${icao.toUpperCase()}`);
  }
}

export const cacheService = new CacheService();
