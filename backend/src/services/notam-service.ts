import axios from 'axios';
import { cacheService } from './cache';

export interface Notam {
  id: string;
  type: string;
  classification: 'Aerodrome' | 'Airspace' | 'Obstacle' | 'Procedure' | 'Navigation' | 'Other';
  icao: string;
  effectiveStart: string;
  effectiveEnd: string;
  text: string;
  isActive: boolean;
  priority: 'high' | 'medium' | 'low';
}

function classifyNotam(text: string): Notam['classification'] {
  const upper = text.toUpperCase();
  if (upper.includes('RWY') || upper.includes('TWY') || upper.includes('APRON') || upper.includes('AD ') || upper.includes('CLSD')) {
    return 'Aerodrome';
  }
  if (upper.includes('AIRSPACE') || upper.includes('TFR') || upper.includes('SUA') || upper.includes('MOA')) {
    return 'Airspace';
  }
  if (upper.includes('OBST') || upper.includes('TOWER') || upper.includes('CRANE')) {
    return 'Obstacle';
  }
  if (upper.includes('IAP') || upper.includes('SID') || upper.includes('STAR') || upper.includes('PROC')) {
    return 'Procedure';
  }
  if (upper.includes('VOR') || upper.includes('ILS') || upper.includes('LOC') || upper.includes('NAV')) {
    return 'Navigation';
  }
  return 'Other';
}

function determinePriority(text: string): Notam['priority'] {
  const upper = text.toUpperCase();
  if (upper.includes('CLSD') || upper.includes('TFR') || upper.includes('UNSERVICEABLE') || upper.includes('OUT OF SERVICE')) {
    return 'high';
  }
  if (upper.includes('U/S') || upper.includes('OTS') || upper.includes('LIMITED') || upper.includes('CHANGED')) {
    return 'medium';
  }
  return 'low';
}

class NotamService {
  async getNotamsForAirport(icao: string): Promise<Notam[]> {
    const normalizedIcao = icao.toUpperCase();
    const cacheKey = `notams:${normalizedIcao}`;

    const cached = await cacheService.get<Notam[]>(cacheKey);
    if (cached) return cached;

    try {
      // Use FAA NOTAM API
      const response = await axios.post(
        'https://notams.aim.faa.gov/notamSearch/search',
        `searchType=0&designatorsForLocation=${normalizedIcao}&notamType=all`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          timeout: 15000,
        }
      );

      const data = response.data;
      const notams: Notam[] = [];
      const now = new Date();

      // The FAA API returns various formats — try to parse
      if (data && data.notamList && Array.isArray(data.notamList)) {
        for (const item of data.notamList) {
          const text = item.icaoMessage || item.traditionalMessage || item.text || '';
          const id = item.notamNumber || item.id || `NOTAM-${notams.length}`;

          const effectiveStart = item.effectiveStart || item.startValidity || now.toISOString();
          const effectiveEnd = item.effectiveEnd || item.endValidity || '';

          const isActive = effectiveEnd
            ? new Date(effectiveEnd) > now
            : true;

          notams.push({
            id: String(id),
            type: item.type || 'N',
            classification: classifyNotam(text),
            icao: normalizedIcao,
            effectiveStart,
            effectiveEnd,
            text,
            isActive,
            priority: determinePriority(text),
          });
        }
      } else if (typeof data === 'string') {
        // Parse raw text response
        const blocks = data.split(/(?=!)/);
        for (const block of blocks) {
          const trimmed = block.trim();
          if (!trimmed || trimmed.length < 10) continue;

          // Extract NOTAM ID
          const idMatch = trimmed.match(/!(\S+)/);
          const id = idMatch ? idMatch[1] : `NOTAM-${notams.length}`;

          notams.push({
            id,
            type: 'N',
            classification: classifyNotam(trimmed),
            icao: normalizedIcao,
            effectiveStart: now.toISOString(),
            effectiveEnd: '',
            text: trimmed,
            isActive: true,
            priority: determinePriority(trimmed),
          });
        }
      }

      // Sort by priority
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      notams.sort(
        (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
      );

      await cacheService.set(cacheKey, notams, 600); // 10 min cache
      return notams;
    } catch (error) {
      console.error(`NOTAM fetch error for ${normalizedIcao}:`, error);
      return []; // Graceful fallback
    }
  }
}

export const notamService = new NotamService();
