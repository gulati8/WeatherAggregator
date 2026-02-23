import axios from 'axios';
import { cacheService } from './cache';
import { config } from '../config';

export interface WindsAloftLevel {
  altitude: number; // feet MSL
  windDirection: number | null; // degrees, null = light and variable
  windSpeed: number; // knots
  temperature: number | null; // Celsius
  lightAndVariable: boolean;
}

export interface WindsAloftStation {
  stationId: string;
  levels: WindsAloftLevel[];
}

export interface WindsAloftForecast {
  basedOn: string;
  validTime: string;
  forecastHour: string;
  stations: WindsAloftStation[];
}

// Standard altitude columns in the FD text
const LOW_ALTITUDES = [3000, 6000, 9000, 12000, 18000, 24000];
const HIGH_ALTITUDES = [30000, 34000, 39000];

/**
 * Parse a single wind/temp group from FD text.
 * Format: DDSS or DDSS+TT or DDSS-TT
 * DD * 10 = wind direction degrees
 * SS = wind speed knots
 * If DD >= 51: subtract 50, add 100 to speed (winds > 99 kts)
 * 9900 = light and variable
 * Above 24000ft: temp is always negative (no sign shown)
 */
function parseWindTempGroup(
  group: string,
  altitude: number
): WindsAloftLevel {
  const trimmed = group.trim();

  if (!trimmed || trimmed === '    ' || trimmed.length < 4) {
    return {
      altitude,
      windDirection: null,
      windSpeed: 0,
      temperature: null,
      lightAndVariable: false,
    };
  }

  // Extract wind portion (first 4 chars) and temp portion (remainder)
  const windPart = trimmed.slice(0, 4);
  const tempPart = trimmed.slice(4).trim();

  const dd = parseInt(windPart.slice(0, 2), 10);
  const ss = parseInt(windPart.slice(2, 4), 10);

  // Light and variable
  if (dd === 99 && ss === 0) {
    let temperature: number | null = null;
    if (tempPart) {
      temperature = parseTemp(tempPart, altitude);
    }
    return {
      altitude,
      windDirection: null,
      windSpeed: 0,
      temperature,
      lightAndVariable: true,
    };
  }

  let direction = dd * 10;
  let speed = ss;

  // DD >= 51 means subtract 50 from direction, add 100 to speed
  if (dd >= 51 && dd <= 86) {
    direction = (dd - 50) * 10;
    speed = ss + 100;
  }

  let temperature: number | null = null;
  if (tempPart) {
    temperature = parseTemp(tempPart, altitude);
  }

  return {
    altitude,
    windDirection: direction,
    windSpeed: speed,
    temperature,
    lightAndVariable: false,
  };
}

function parseTemp(tempStr: string, altitude: number): number | null {
  if (!tempStr) return null;

  // Remove leading +/- for parsing
  let sign = 1;
  let str = tempStr;

  if (str.startsWith('+')) {
    str = str.slice(1);
  } else if (str.startsWith('-')) {
    sign = -1;
    str = str.slice(1);
  } else if (altitude >= 24000) {
    // Above 24000ft, temp is always negative
    sign = -1;
  }

  const val = parseInt(str, 10);
  if (isNaN(val)) return null;
  return sign * val;
}

/**
 * Parse the FD winds aloft text format from AWC.
 * The text is a fixed-width table with station IDs on the left
 * and wind/temp groups for each altitude column.
 */
function parseFdText(text: string, isHigh: boolean): WindsAloftStation[] {
  const lines = text.split('\n');
  const stations: WindsAloftStation[] = [];
  const altitudes = isHigh ? HIGH_ALTITUDES : LOW_ALTITUDES;

  let dataStarted = false;

  for (const line of lines) {
    // Skip header lines until we find data lines
    // Data lines start with a 3-letter station identifier
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Look for the header line with altitudes to know data starts after
    if (trimmed.match(/^FT\s+\d{4}/i) || trimmed.match(/^\s*\d{4}\s+\d{4}/)) {
      dataStarted = true;
      continue;
    }

    if (!dataStarted) continue;

    // Data line: starts with 3-letter station ID
    const stationMatch = trimmed.match(/^([A-Z]{3})\s+(.*)/i);
    if (!stationMatch) continue;

    const stationId = stationMatch[1].toUpperCase();
    const dataStr = stationMatch[2];

    // Parse groups — they're roughly fixed-width (4 chars wind + 2-3 chars temp)
    // Split by whitespace groups
    const groups = dataStr.split(/\s{2,}|\s+/).filter(Boolean);

    const levels: WindsAloftLevel[] = [];

    for (let i = 0; i < Math.min(groups.length, altitudes.length); i++) {
      levels.push(parseWindTempGroup(groups[i], altitudes[i]));
    }

    if (levels.length > 0) {
      stations.push({ stationId, levels });
    }
  }

  return stations;
}

// Map common ICAO prefixes to 3-letter FD station IDs
function icaoToStation(icao: string): string {
  // US airports: strip K prefix (KJFK → JFK)
  if (icao.startsWith('K') && icao.length === 4) {
    return icao.slice(1);
  }
  // Return last 3 characters as fallback
  return icao.slice(-3);
}

class WindsAloftService {
  async getForecast(icao: string, fcstHour: string = '06'): Promise<WindsAloftForecast | null> {
    const normalizedIcao = icao.toUpperCase();
    const cacheKey = `winds-aloft:${normalizedIcao}:${fcstHour}`;

    const cached = await cacheService.get<WindsAloftForecast>(cacheKey);
    if (cached) return cached;

    try {
      // Fetch low and high level winds
      const [lowRes, highRes] = await Promise.allSettled([
        axios.get(`${config.apis.aviationWeather.baseUrl}/windtemp`, {
          params: { region: 'all', level: 'low', fcst: fcstHour, layout: 'off' },
          timeout: 10000,
        }),
        axios.get(`${config.apis.aviationWeather.baseUrl}/windtemp`, {
          params: { region: 'all', level: 'high', fcst: fcstHour, layout: 'off' },
          timeout: 10000,
        }),
      ]);

      const lowText = lowRes.status === 'fulfilled' ? lowRes.value.data : '';
      const highText = highRes.status === 'fulfilled' ? highRes.value.data : '';

      if (!lowText && !highText) return null;

      const lowStations = parseFdText(lowText, false);
      const highStations = parseFdText(highText, true);

      // Merge high-level data into low-level stations
      const stationMap = new Map<string, WindsAloftStation>();

      for (const station of lowStations) {
        stationMap.set(station.stationId, station);
      }

      for (const station of highStations) {
        const existing = stationMap.get(station.stationId);
        if (existing) {
          existing.levels.push(...station.levels);
        } else {
          stationMap.set(station.stationId, station);
        }
      }

      // Sort each station's levels by altitude
      for (const station of stationMap.values()) {
        station.levels.sort((a, b) => a.altitude - b.altitude);
      }

      // Find the station matching this ICAO
      const targetStation = icaoToStation(normalizedIcao);
      const allStations = Array.from(stationMap.values());

      // Filter to just the matching station (or return all nearby if not found)
      const matchedStation = allStations.find(
        (s) => s.stationId === targetStation
      );

      const result: WindsAloftForecast = {
        basedOn: new Date().toISOString(),
        validTime: new Date().toISOString(),
        forecastHour: fcstHour,
        stations: matchedStation ? [matchedStation] : allStations.slice(0, 5),
      };

      await cacheService.set(cacheKey, result, 600); // 10 min cache
      return result;
    } catch (error) {
      console.error('Winds aloft fetch error:', error);
      return null;
    }
  }
}

export const windsAloftService = new WindsAloftService();
