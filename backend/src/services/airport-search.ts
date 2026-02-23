import https from 'https';

export interface AirportRecord {
  icao: string;
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  type: 'large_airport' | 'medium_airport';
}

const CSV_URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

let airports: AirportRecord[] = [];
let lastFetch = 0;

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function fetchCSV(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = (targetUrl: string) => {
      https.get(targetUrl, (res) => {
        // Follow redirects
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          request(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => resolve(data));
        res.on('error', reject);
      }).on('error', reject);
    };
    request(url);
  });
}

async function loadAirports(): Promise<void> {
  console.log('Fetching airport data from OurAirports...');
  const csv = await fetchCSV(CSV_URL);
  const lines = csv.split('\n');

  if (lines.length < 2) {
    throw new Error('Airport CSV appears empty');
  }

  // Parse header to find column indices
  const header = parseCSVLine(lines[0]);
  const idx: Record<string, number> = {};
  header.forEach((col, i) => { idx[col.trim()] = i; });

  const required = ['ident', 'type', 'name', 'latitude_deg', 'longitude_deg', 'iso_country', 'municipality', 'iata_code'];
  for (const col of required) {
    if (!(col in idx)) {
      throw new Error(`Missing required column: ${col}`);
    }
  }

  const results: AirportRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCSVLine(line);
    const type = fields[idx['type']] || '';

    // Only include medium and large airports
    if (type !== 'large_airport' && type !== 'medium_airport') continue;

    const icao = (fields[idx['ident']] || '').trim();
    if (!icao || icao.length < 2) continue;

    const lat = parseFloat(fields[idx['latitude_deg']]);
    const lon = parseFloat(fields[idx['longitude_deg']]);
    if (isNaN(lat) || isNaN(lon)) continue;

    results.push({
      icao,
      iata: (fields[idx['iata_code']] || '').trim(),
      name: (fields[idx['name']] || '').trim(),
      city: (fields[idx['municipality']] || '').trim(),
      country: (fields[idx['iso_country']] || '').trim(),
      lat,
      lon,
      type: type as 'large_airport' | 'medium_airport',
    });
  }

  airports = results;
  lastFetch = Date.now();
  console.log(`Loaded ${airports.length} airports`);
}

function scoreMatch(airport: AirportRecord, queryLower: string, isLarge: boolean): number {
  const icaoLower = airport.icao.toLowerCase();
  const iataLower = airport.iata.toLowerCase();
  const cityLower = airport.city.toLowerCase();
  const nameLower = airport.name.toLowerCase();
  const sizeBonus = isLarge ? 1 : 0;

  // Exact ICAO match
  if (icaoLower === queryLower) return 100 + sizeBonus;

  // Exact IATA match
  if (iataLower === queryLower) return 90 + sizeBonus;

  // ICAO prefix
  if (icaoLower.startsWith(queryLower)) return 80 + sizeBonus;

  // IATA prefix
  if (iataLower.startsWith(queryLower)) return 70 + sizeBonus;

  // City starts with
  if (cityLower.startsWith(queryLower)) return 60 + sizeBonus;

  // City word starts with (e.g., "york" matches "New York")
  const cityWords = cityLower.split(/\s+/);
  if (cityWords.some(w => w.startsWith(queryLower))) return 50 + sizeBonus;

  // Name contains
  if (nameLower.includes(queryLower)) return 40 + sizeBonus;

  // City contains
  if (cityLower.includes(queryLower)) return 30 + sizeBonus;

  return 0;
}

export const airportSearch = {
  async init(): Promise<void> {
    await loadAirports();

    // Schedule periodic refresh
    setInterval(async () => {
      try {
        await loadAirports();
      } catch (err) {
        console.error('Failed to refresh airport data:', err);
      }
    }, REFRESH_INTERVAL_MS);
  },

  search(query: string, limit = 10): AirportRecord[] {
    if (!query || airports.length === 0) return [];

    const queryLower = query.toLowerCase().trim();
    if (!queryLower) return [];

    // Build a large_airport set for size bonus
    const scored: { airport: AirportRecord; score: number }[] = [];

    for (const airport of airports) {
      const isLarge = airport.type === 'large_airport';
      const score = scoreMatch(airport, queryLower, isLarge);
      if (score > 0) {
        scored.push({ airport, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.airport);
  },

  getCount(): number {
    return airports.length;
  },

  isStale(): boolean {
    return Date.now() - lastFetch > REFRESH_INTERVAL_MS * 1.5;
  },
};
