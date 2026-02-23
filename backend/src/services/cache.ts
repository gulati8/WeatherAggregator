import { config } from '../config';
import { getRedis } from './redis';

class CacheService {
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const data = await getRedis().get(key);
      if (data === null) return undefined;
      return JSON.parse(data) as T;
    } catch {
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await getRedis().setex(key, ttlSeconds, serialized);
      } else {
        await getRedis().set(key, serialized);
      }
      return true;
    } catch {
      return false;
    }
  }

  async del(key: string): Promise<number> {
    try {
      return await getRedis().del(key);
    } catch {
      return 0;
    }
  }

  async flush(): Promise<void> {
    try {
      await getRedis().flushdb();
    } catch {
      // ignore
    }
  }

  // Convenience methods with default TTLs
  async setMetar<T>(icao: string, value: T): Promise<boolean> {
    return this.set(`metar:${icao.toUpperCase()}`, value, config.cache.metarTtl);
  }

  async getMetar<T>(icao: string): Promise<T | undefined> {
    return this.get<T>(`metar:${icao.toUpperCase()}`);
  }

  async setTaf<T>(icao: string, value: T): Promise<boolean> {
    return this.set(`taf:${icao.toUpperCase()}`, value, config.cache.tafTtl);
  }

  async getTaf<T>(icao: string): Promise<T | undefined> {
    return this.get<T>(`taf:${icao.toUpperCase()}`);
  }

  async setAirport<T>(icao: string, value: T): Promise<boolean> {
    return this.set(`airport:${icao.toUpperCase()}`, value, config.cache.airportTtl);
  }

  async getAirport<T>(icao: string): Promise<T | undefined> {
    return this.get<T>(`airport:${icao.toUpperCase()}`);
  }

  async setWeather<T>(icao: string, value: T): Promise<boolean> {
    return this.set(`weather:${icao.toUpperCase()}`, value, config.cache.metarTtl);
  }

  async getWeather<T>(icao: string): Promise<T | undefined> {
    return this.get<T>(`weather:${icao.toUpperCase()}`);
  }
}

export const cacheService = new CacheService();
