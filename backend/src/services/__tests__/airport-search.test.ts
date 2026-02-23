import { describe, it, expect, vi, beforeAll } from 'vitest';

// ---------------------------------------------------------------------------
// Mock https.get to return fixture CSV data
// ---------------------------------------------------------------------------

const FIXTURE_CSV = `id,ident,type,name,latitude_deg,longitude_deg,elevation_ft,continent,iso_country,iso_region,municipality,scheduled_service,gps_code,iata_code,local_code,home_link,wikipedia_link,keywords
1,KJFK,large_airport,"John F Kennedy International Airport",40.6399,-73.7787,13,NA,US,US-NY,New York,yes,KJFK,JFK,JFK,,,,
2,KLAX,large_airport,"Los Angeles International Airport",33.9425,-118.408,125,NA,US,US-CA,Los Angeles,yes,KLAX,LAX,LAX,,,,
3,KORD,large_airport,"Chicago O'Hare International Airport",41.9742,-87.9073,672,NA,US,US-IL,Chicago,yes,KORD,ORD,ORD,,,,
4,EGLL,large_airport,"London Heathrow Airport",51.4706,-0.4619,83,EU,GB,GB-ENG,London,yes,EGLL,LHR,,,,,
5,CYWG,medium_airport,"Winnipeg James Armstrong Richardson International Airport",49.91,-97.2399,783,NA,CA,CA-MB,Winnipeg,yes,CYWG,YWG,,,,,`;

vi.mock('https', () => ({
  default: {
    get: vi.fn((_url: string, cb: (res: unknown) => void) => {
      const listeners: Record<string, Array<(data?: unknown) => void>> = {};
      const res = {
        statusCode: 200,
        headers: {},
        on: (event: string, handler: (data?: unknown) => void) => {
          if (!listeners[event]) listeners[event] = [];
          listeners[event].push(handler);
          return res;
        },
      };
      cb(res);
      // Emit data + end via microtask (Promise) so fake timers aren't needed
      Promise.resolve().then(() => {
        listeners['data']?.forEach((h) => h(FIXTURE_CSV));
        listeners['end']?.forEach((h) => h());
      });
      return { on: vi.fn().mockReturnThis() };
    }),
  },
}));

// Import after mocking
import { airportSearch } from '../airport-search';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AirportSearch', () => {
  // Init once; the search() function is stateless after init
  beforeAll(async () => {
    await airportSearch.init();
  });

  it('loads airports from CSV', () => {
    expect(airportSearch.getCount()).toBe(5);
  });

  it('exact ICAO match scores highest', () => {
    const results = airportSearch.search('KJFK');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].icao).toBe('KJFK');
  });

  it('exact IATA match returns correct airport', () => {
    const results = airportSearch.search('JFK');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].icao).toBe('KJFK');
  });

  it('ICAO prefix match works', () => {
    const results = airportSearch.search('KJ');
    expect(results.some((a) => a.icao === 'KJFK')).toBe(true);
  });

  it('city match works', () => {
    const results = airportSearch.search('Chicago');
    expect(results.some((a) => a.icao === 'KORD')).toBe(true);
  });

  it('name contains match works', () => {
    const results = airportSearch.search('Heathrow');
    expect(results.some((a) => a.icao === 'EGLL')).toBe(true);
  });

  it('gives size bonus to large airports over medium', () => {
    // All airports match "airport" in name. CYWG is medium, rest are large.
    const results = airportSearch.search('airport');
    expect(results.length).toBe(5);
    // CYWG should be last among equal name-contains matches because it lacks the +1 bonus
    const cywgIdx = results.findIndex((a) => a.icao === 'CYWG');
    expect(cywgIdx).toBeGreaterThan(0); // Should not be first
  });

  it('is case-insensitive', () => {
    const lower = airportSearch.search('kjfk');
    const upper = airportSearch.search('KJFK');
    expect(lower[0].icao).toBe(upper[0].icao);
  });

  it('respects limit param', () => {
    const results = airportSearch.search('K', 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('returns empty array for empty query', () => {
    expect(airportSearch.search('')).toEqual([]);
  });

  it('returns empty array for whitespace query', () => {
    expect(airportSearch.search('   ')).toEqual([]);
  });
});
