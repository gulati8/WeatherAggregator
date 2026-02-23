import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AwcMetarResponse, AwcTafResponse } from '../aviation-weather';
import type { OpenMeteoResponse } from '../open-meteo';

// ---------------------------------------------------------------------------
// Mock all external service modules BEFORE importing the aggregator
// ---------------------------------------------------------------------------

vi.mock('../aviation-weather', () => ({
  aviationWeatherService: {
    getMetarAndTaf: vi.fn(),
    getMetar: vi.fn(),
    getRecentMetars: vi.fn().mockResolvedValue([]),
    getPireps: vi.fn().mockResolvedValue([]),
    getAirSigmets: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../open-meteo', () => ({
  openMeteoService: {
    getForecast: vi.fn(),
    visibilityToStatuteMiles: vi.fn((m: number) => m / 1609.344),
    windSpeedToKnots: vi.fn((kmh: number) => kmh * 0.539957),
  },
}));

vi.mock('../nws', () => ({
  nwsService: {
    getAlerts: vi.fn().mockResolvedValue([]),
    mapSeverity: vi.fn(() => 'info' as const),
  },
}));

vi.mock('../cache', () => ({
  cacheService: {
    getWeather: vi.fn().mockReturnValue(undefined),
    setWeather: vi.fn(),
    getMetar: vi.fn().mockReturnValue(undefined),
    setMetar: vi.fn(),
    getTaf: vi.fn().mockReturnValue(undefined),
    setTaf: vi.fn(),
  },
}));

// Now import the aggregator and the mocked services
import { weatherAggregator } from '../weather-aggregator';
import { aviationWeatherService } from '../aviation-weather';
import { openMeteoService } from '../open-meteo';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function createMockMetar(overrides: Partial<AwcMetarResponse> = {}): AwcMetarResponse {
  return {
    metar_id: 1,
    icaoId: 'KJFK',
    receiptTime: '2026-02-22T12:00:00Z',
    obsTime: Date.now() / 1000,
    reportTime: '2026-02-22T12:00:00Z',
    temp: 15,
    dewp: 8,
    wdir: 270,
    wspd: 10,
    wgst: null,
    visib: 10,
    altim: 29.92,
    slp: 1013.25,
    qcField: 0,
    wxString: null,
    presTend: null,
    maxT: null,
    minT: null,
    maxT24: null,
    minT24: null,
    precip: null,
    pcp3hr: null,
    pcp6hr: null,
    pcp24hr: null,
    snow: null,
    vertVis: null,
    metarType: 'METAR',
    rawOb: 'KJFK 221200Z 27010KT 10SM FEW250 15/08 A2992',
    mostRecent: 1,
    lat: 40.6399,
    lon: -73.7787,
    elev: 13,
    prior: 0,
    name: 'John F Kennedy Intl',
    clouds: [{ cover: 'FEW', base: 25000 }],
    ...overrides,
  };
}

function createMockTaf(overrides: Partial<AwcTafResponse> = {}): AwcTafResponse {
  const now = Math.floor(Date.now() / 1000);
  return {
    tafId: 1,
    icaoId: 'KJFK',
    dbPopTime: '2026-02-22T12:00:00Z',
    bulletinTime: '2026-02-22T12:00:00Z',
    issueTime: '2026-02-22T12:00:00Z',
    validTimeFrom: now,
    validTimeTo: now + 24 * 3600,
    rawTAF: 'TAF KJFK ...',
    mostRecent: 1,
    remarks: null,
    lat: 40.6399,
    lon: -73.7787,
    elev: 13,
    prior: 0,
    name: 'John F Kennedy Intl',
    fcsts: [
      {
        timeGroup: 0,
        timeFrom: now,
        timeTo: now + 6 * 3600,
        timeBec: null,
        fcstChange: null,
        probability: null,
        wdir: 270,
        wspd: 10,
        wgst: null,
        wshearHgt: null,
        wshearDir: null,
        wshearSpd: null,
        visib: 10,
        altim: null,
        vertVis: null,
        wxString: null,
        notDecoded: null,
        clouds: [{ cover: 'FEW', base: 25000 }],
        icgTurb: null,
        temp: null,
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WeatherAggregator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAggregatedWeather()', () => {
    it('returns a valid UnifiedWeatherData structure', async () => {
      const metar = createMockMetar();
      const taf = createMockTaf();

      vi.mocked(aviationWeatherService.getMetarAndTaf).mockResolvedValue({
        metar,
        taf,
      });
      vi.mocked(aviationWeatherService.getMetar).mockResolvedValue(metar);
      vi.mocked(openMeteoService.getForecast).mockResolvedValue(null);

      const result = await weatherAggregator.getAggregatedWeather('KJFK');

      expect(result).toHaveProperty('airport');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('sources');
      expect(result).toHaveProperty('current');
      expect(result).toHaveProperty('forecast');
      expect(result).toHaveProperty('consensus');
      expect(result).toHaveProperty('part135Status');
      expect(result).toHaveProperty('alerts');
    });

    it('normalizes ICAO code to uppercase', async () => {
      const metar = createMockMetar();
      const taf = createMockTaf();

      vi.mocked(aviationWeatherService.getMetarAndTaf).mockResolvedValue({
        metar,
        taf,
      });
      vi.mocked(aviationWeatherService.getMetar).mockResolvedValue(metar);
      vi.mocked(openMeteoService.getForecast).mockResolvedValue(null);

      const result = await weatherAggregator.getAggregatedWeather('kjfk');

      // The service should normalize to uppercase
      expect(aviationWeatherService.getMetarAndTaf).toHaveBeenCalledWith('KJFK');
      expect(result.airport.icao).toBe('KJFK');
    });

    it('populates airport info from METAR data', async () => {
      const metar = createMockMetar({
        icaoId: 'KLAX',
        name: 'Los Angeles Intl',
        lat: 33.9425,
        lon: -118.408,
        elev: 125,
      });

      vi.mocked(aviationWeatherService.getMetarAndTaf).mockResolvedValue({
        metar,
        taf: null,
      });
      vi.mocked(aviationWeatherService.getMetar).mockResolvedValue(metar);
      vi.mocked(openMeteoService.getForecast).mockResolvedValue(null);

      const result = await weatherAggregator.getAggregatedWeather('KLAX');

      expect(result.airport.icao).toBe('KLAX');
      expect(result.airport.name).toBe('Los Angeles Intl');
      expect(result.airport.latitude).toBe(33.9425);
      expect(result.airport.longitude).toBe(-118.408);
      expect(result.airport.elevation).toBe(125);
    });

    it('handles missing METAR gracefully', async () => {
      vi.mocked(aviationWeatherService.getMetarAndTaf).mockResolvedValue({
        metar: null,
        taf: null,
      });
      vi.mocked(aviationWeatherService.getMetar).mockResolvedValue(null);
      vi.mocked(openMeteoService.getForecast).mockResolvedValue(null);

      const result = await weatherAggregator.getAggregatedWeather('KXYZ');

      // Should still return a valid structure with defaults
      expect(result.airport.icao).toBe('KXYZ');
      expect(result.airport.latitude).toBe(0);
      expect(result.sources.find((s) => s.id === 'awc')?.status).toBe('error');
    });

    it('includes Part 135 status for VFR conditions', async () => {
      const metar = createMockMetar({
        clouds: [{ cover: 'FEW', base: 25000 }],
        visib: 10,
      });

      vi.mocked(aviationWeatherService.getMetarAndTaf).mockResolvedValue({
        metar,
        taf: null,
      });
      vi.mocked(aviationWeatherService.getMetar).mockResolvedValue(metar);
      vi.mocked(openMeteoService.getForecast).mockResolvedValue(null);

      const result = await weatherAggregator.getAggregatedWeather('KJFK');

      expect(result.part135Status.canDispatch).toBe(true);
      expect(result.part135Status.flightCategory).toBe('VFR');
    });

    it('marks sources status correctly when all sources return data', async () => {
      const metar = createMockMetar();
      vi.mocked(aviationWeatherService.getMetarAndTaf).mockResolvedValue({
        metar,
        taf: createMockTaf(),
      });
      vi.mocked(aviationWeatherService.getMetar).mockResolvedValue(metar);
      vi.mocked(openMeteoService.getForecast).mockResolvedValue(null);

      const result = await weatherAggregator.getAggregatedWeather('KJFK');

      const awcSource = result.sources.find((s) => s.id === 'awc');
      expect(awcSource?.status).toBe('ok');
    });

    it('reports source error when Open-Meteo fetch fails', async () => {
      const metar = createMockMetar();
      vi.mocked(aviationWeatherService.getMetarAndTaf).mockResolvedValue({
        metar,
        taf: null,
      });
      // getMetar succeeds but getForecast throws => fetchOpenMeteo rejects
      vi.mocked(aviationWeatherService.getMetar).mockResolvedValue(metar);
      vi.mocked(openMeteoService.getForecast).mockRejectedValue(
        new Error('Network error')
      );

      const result = await weatherAggregator.getAggregatedWeather('KJFK');

      const omSource = result.sources.find((s) => s.id === 'openmeteo');
      expect(omSource?.status).toBe('error');
      // Should still have valid result from AWC
      expect(result.current.temperature.value).toBe(15);
    });

    it('builds forecast periods from TAF data', async () => {
      const now = Math.floor(Date.now() / 1000);
      const metar = createMockMetar();
      const taf = createMockTaf({
        fcsts: [
          {
            timeGroup: 0,
            timeFrom: now,
            timeTo: now + 6 * 3600,
            timeBec: null,
            fcstChange: 'FM',
            probability: null,
            wdir: 270,
            wspd: 15,
            wgst: 25,
            wshearHgt: null,
            wshearDir: null,
            wshearSpd: null,
            visib: 6,
            altim: null,
            vertVis: null,
            wxString: null,
            notDecoded: null,
            clouds: [{ cover: 'BKN', base: 4000 }],
            icgTurb: null,
            temp: null,
          },
          {
            timeGroup: 1,
            timeFrom: now + 6 * 3600,
            timeTo: now + 12 * 3600,
            timeBec: null,
            fcstChange: 'FM',
            probability: null,
            wdir: 180,
            wspd: 8,
            wgst: null,
            wshearHgt: null,
            wshearDir: null,
            wshearSpd: null,
            visib: 10,
            altim: null,
            vertVis: null,
            wxString: null,
            notDecoded: null,
            clouds: [{ cover: 'FEW', base: 20000 }],
            icgTurb: null,
            temp: null,
          },
        ],
      });

      vi.mocked(aviationWeatherService.getMetarAndTaf).mockResolvedValue({
        metar,
        taf,
      });
      vi.mocked(aviationWeatherService.getMetar).mockResolvedValue(metar);
      vi.mocked(openMeteoService.getForecast).mockResolvedValue(null);

      const result = await weatherAggregator.getAggregatedWeather('KJFK');

      // Should have at least the 2 TAF periods
      expect(result.forecast.length).toBeGreaterThanOrEqual(2);
      // First period should have BKN ceiling at 4000
      const firstPeriod = result.forecast[0];
      expect(firstPeriod.ceiling.value).toBe(4000);
      expect(firstPeriod.windSpeed.value).toBe(15);
    });

    it('parses weather phenomena from METAR wxString', async () => {
      const metar = createMockMetar({
        wxString: '-RA BR',
        visib: 3,
        clouds: [{ cover: 'OVC', base: 800 }],
      });

      vi.mocked(aviationWeatherService.getMetarAndTaf).mockResolvedValue({
        metar,
        taf: null,
      });
      vi.mocked(aviationWeatherService.getMetar).mockResolvedValue(metar);
      vi.mocked(openMeteoService.getForecast).mockResolvedValue(null);

      const result = await weatherAggregator.getAggregatedWeather('KJFK');

      expect(result.current.weatherPhenomena.length).toBeGreaterThanOrEqual(2);
      const rain = result.current.weatherPhenomena.find((p) => p.type === 'RA');
      expect(rain).toBeDefined();
      expect(rain!.intensity).toBe('-');
    });

    it('calculates ceiling from BKN/OVC cloud layers', async () => {
      const metar = createMockMetar({
        clouds: [
          { cover: 'SCT', base: 2000 },
          { cover: 'BKN', base: 5000 },
          { cover: 'OVC', base: 8000 },
        ],
      });

      vi.mocked(aviationWeatherService.getMetarAndTaf).mockResolvedValue({
        metar,
        taf: null,
      });
      vi.mocked(aviationWeatherService.getMetar).mockResolvedValue(metar);
      vi.mocked(openMeteoService.getForecast).mockResolvedValue(null);

      const result = await weatherAggregator.getAggregatedWeather('KJFK');

      // Ceiling should be the lowest BKN/OVC layer = 5000
      expect(result.current.ceiling.value).toBe(5000);
    });
  });
});
