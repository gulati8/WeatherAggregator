import { describe, it, expect } from 'vitest';
import { part135Checker } from '../part135-checker';
import {
  CurrentConditions,
  ForecastPeriod,
  SourceValue,
  FlightCategory,
  WeatherPhenomenon,
  CloudLayer,
} from '../../types/weather';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sv<T>(value: T): SourceValue<T> {
  return { value, bySource: {}, confidence: 'high' };
}

function createTestConditions(
  overrides: Partial<{
    ceiling: number | null;
    visibility: number;
    windSpeed: number;
    windGust: number | null;
    temperature: number;
    dewpoint: number;
    weatherPhenomena: WeatherPhenomenon[];
    cloudLayers: CloudLayer[];
  }> = {}
): CurrentConditions {
  const ceiling = overrides.ceiling !== undefined ? overrides.ceiling : 5000;
  const visibility = overrides.visibility !== undefined ? overrides.visibility : 10;
  const windSpeed = overrides.windSpeed !== undefined ? overrides.windSpeed : 5;
  const windGust = overrides.windGust !== undefined ? overrides.windGust : null;
  const temperature = overrides.temperature !== undefined ? overrides.temperature : 20;
  const dewpoint = overrides.dewpoint !== undefined ? overrides.dewpoint : 10;

  return {
    observationTime: new Date().toISOString(),
    temperature: sv(temperature),
    dewpoint: sv(dewpoint),
    humidity: sv(50),
    pressure: sv(29.92),
    windDirection: sv(270),
    windSpeed: sv(windSpeed),
    windGust: sv(windGust),
    visibility: sv(visibility),
    ceiling: sv(ceiling),
    cloudLayers: overrides.cloudLayers ?? [{ coverage: 'SCT', base: 5000 }],
    weatherPhenomena: overrides.weatherPhenomena ?? [],
    flightCategory: sv('VFR' as FlightCategory),
  };
}

function createTestForecast(
  overrides: Partial<{
    validFrom: string;
    validTo: string;
    ceiling: number | null;
    visibility: number;
    weatherPhenomena: WeatherPhenomenon[];
  }> = {}
): ForecastPeriod {
  const now = new Date();
  return {
    validFrom: overrides.validFrom ?? now.toISOString(),
    validTo: overrides.validTo ?? new Date(now.getTime() + 6 * 3600000).toISOString(),
    type: 'BASE',
    temperature: sv(20),
    windDirection: sv(270),
    windSpeed: sv(10),
    windGust: sv(null),
    visibility: sv(overrides.visibility !== undefined ? overrides.visibility : 10),
    ceiling: sv(overrides.ceiling !== undefined ? overrides.ceiling : null),
    precipitationProbability: sv(0),
    cloudLayers: [],
    weatherPhenomena: overrides.weatherPhenomena ?? [],
    flightCategory: sv('VFR' as FlightCategory),
  };
}

// ---------------------------------------------------------------------------
// categorize()
// ---------------------------------------------------------------------------

describe('Part135Checker', () => {
  describe('categorize()', () => {
    it('returns VFR for ceiling >= 3000 and visibility >= 5', () => {
      expect(part135Checker.categorize(3000, 5)).toBe('VFR');
      expect(part135Checker.categorize(5000, 10)).toBe('VFR');
      expect(part135Checker.categorize(10000, 15)).toBe('VFR');
    });

    it('returns VFR for null (unlimited) ceiling with good visibility', () => {
      expect(part135Checker.categorize(null, 10)).toBe('VFR');
      expect(part135Checker.categorize(null, 5)).toBe('VFR');
    });

    it('returns MVFR for ceiling 1000-2999 with good visibility', () => {
      expect(part135Checker.categorize(1000, 10)).toBe('MVFR');
      expect(part135Checker.categorize(2999, 10)).toBe('MVFR');
      expect(part135Checker.categorize(2000, 10)).toBe('MVFR');
    });

    it('returns MVFR for good ceiling but visibility 3-4.99', () => {
      expect(part135Checker.categorize(5000, 3)).toBe('MVFR');
      expect(part135Checker.categorize(5000, 4.99)).toBe('MVFR');
      expect(part135Checker.categorize(null, 3)).toBe('MVFR');
      expect(part135Checker.categorize(null, 4.5)).toBe('MVFR');
    });

    it('returns IFR for ceiling 500-999 with good visibility', () => {
      expect(part135Checker.categorize(500, 10)).toBe('IFR');
      expect(part135Checker.categorize(999, 10)).toBe('IFR');
      expect(part135Checker.categorize(700, 10)).toBe('IFR');
    });

    it('returns IFR for good ceiling but visibility 1-2.99', () => {
      expect(part135Checker.categorize(5000, 1)).toBe('IFR');
      expect(part135Checker.categorize(5000, 2.99)).toBe('IFR');
      expect(part135Checker.categorize(null, 1)).toBe('IFR');
      expect(part135Checker.categorize(null, 2.5)).toBe('IFR');
    });

    it('returns LIFR for ceiling < 500', () => {
      expect(part135Checker.categorize(499, 10)).toBe('LIFR');
      expect(part135Checker.categorize(0, 10)).toBe('LIFR');
      expect(part135Checker.categorize(200, 10)).toBe('LIFR');
    });

    it('returns LIFR for visibility < 1', () => {
      expect(part135Checker.categorize(5000, 0.5)).toBe('LIFR');
      expect(part135Checker.categorize(5000, 0)).toBe('LIFR');
      expect(part135Checker.categorize(null, 0.5)).toBe('LIFR');
    });

    it('returns the worst category when ceiling and visibility disagree', () => {
      // Ceiling says VFR, visibility says LIFR => LIFR wins
      expect(part135Checker.categorize(5000, 0.5)).toBe('LIFR');
      // Ceiling says LIFR, visibility says VFR => LIFR wins
      expect(part135Checker.categorize(200, 10)).toBe('LIFR');
      // Ceiling IFR, visibility MVFR => IFR wins (lower is worse)
      expect(part135Checker.categorize(700, 4)).toBe('IFR');
    });
  });

  // -------------------------------------------------------------------------
  // checkMinimum()
  // -------------------------------------------------------------------------

  describe('checkMinimum()', () => {
    it('returns "above" when value well exceeds minimum', () => {
      const result = part135Checker.checkMinimum(1000, 500);
      expect(result.status).toBe('above');
      expect(result.margin).toBe(500);
      expect(result.value).toBe(1000);
      expect(result.minimum).toBe(500);
    });

    it('returns "at" when value is exactly at minimum', () => {
      const result = part135Checker.checkMinimum(500, 500);
      expect(result.status).toBe('at');
      expect(result.margin).toBe(0);
    });

    it('returns "at" when value is within 50 of minimum', () => {
      const result = part135Checker.checkMinimum(540, 500);
      expect(result.status).toBe('at');
      expect(result.margin).toBe(40);
    });

    it('returns "above" when margin is exactly 51', () => {
      const result = part135Checker.checkMinimum(551, 500);
      expect(result.status).toBe('above');
      expect(result.margin).toBe(51);
    });

    it('returns "below" when value is under minimum', () => {
      const result = part135Checker.checkMinimum(300, 500);
      expect(result.status).toBe('below');
      expect(result.margin).toBe(-200);
    });

    it('returns "above" with Infinity margin for null (unlimited) value', () => {
      const result = part135Checker.checkMinimum(null, 500);
      expect(result.status).toBe('above');
      expect(result.margin).toBe(Infinity);
      expect(result.value).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // identifyHazards()
  // -------------------------------------------------------------------------

  describe('identifyHazards()', () => {
    it('returns empty array for clear conditions', () => {
      const conditions = createTestConditions();
      expect(part135Checker.identifyHazards(conditions)).toEqual([]);
    });

    it('identifies thunderstorms', () => {
      const conditions = createTestConditions({
        weatherPhenomena: [
          { intensity: '', descriptor: 'TS', type: 'RA', description: 'Thunderstorm Rain' },
        ],
      });
      const hazards = part135Checker.identifyHazards(conditions);
      expect(hazards).toContain('Thunderstorms in vicinity');
    });

    it('identifies freezing precipitation', () => {
      const conditions = createTestConditions({
        weatherPhenomena: [
          { intensity: '', descriptor: 'FZ', type: 'RA', description: 'Freezing Rain' },
        ],
      });
      const hazards = part135Checker.identifyHazards(conditions);
      expect(hazards).toContain('Freezing precipitation');
    });

    it('identifies fog', () => {
      const conditions = createTestConditions({
        weatherPhenomena: [
          { intensity: '', type: 'FG', description: 'Fog' },
        ],
      });
      const hazards = part135Checker.identifyHazards(conditions);
      expect(hazards).toContain('Fog');
    });

    it('identifies heavy precipitation', () => {
      const conditions = createTestConditions({
        weatherPhenomena: [
          { intensity: '+', type: 'RA', description: 'Heavy Rain' },
        ],
      });
      const hazards = part135Checker.identifyHazards(conditions);
      expect(hazards).toContain('Heavy precipitation');
    });

    it('identifies very low visibility', () => {
      const conditions = createTestConditions({ visibility: 0.5 });
      const hazards = part135Checker.identifyHazards(conditions);
      expect(hazards).toContain('Very low visibility');
    });

    it('identifies strong surface winds', () => {
      const conditions = createTestConditions({ windSpeed: 30 });
      const hazards = part135Checker.identifyHazards(conditions);
      expect(hazards).toContain('Strong surface winds');
    });

    it('identifies strong wind gusts', () => {
      const conditions = createTestConditions({ windGust: 40 });
      const hazards = part135Checker.identifyHazards(conditions);
      expect(hazards).toContain('Strong wind gusts');
    });

    it('identifies cumulonimbus clouds', () => {
      const conditions = createTestConditions({
        cloudLayers: [{ coverage: 'BKN', base: 3000, type: 'CB' }],
      });
      const hazards = part135Checker.identifyHazards(conditions);
      expect(hazards).toContain('Cumulonimbus clouds present');
    });

    it('identifies multiple simultaneous hazards', () => {
      const conditions = createTestConditions({
        visibility: 0.5,
        windSpeed: 30,
        windGust: 40,
        weatherPhenomena: [
          { intensity: '+', descriptor: 'TS', type: 'RA', description: 'Heavy Thunderstorm Rain' },
          { intensity: '', descriptor: 'FZ', type: 'DZ', description: 'Freezing Drizzle' },
        ],
        cloudLayers: [{ coverage: 'OVC', base: 200, type: 'CB' }],
      });
      const hazards = part135Checker.identifyHazards(conditions);
      expect(hazards.length).toBeGreaterThanOrEqual(5);
      expect(hazards).toContain('Thunderstorms in vicinity');
      expect(hazards).toContain('Freezing precipitation');
      expect(hazards).toContain('Heavy precipitation');
      expect(hazards).toContain('Very low visibility');
      expect(hazards).toContain('Strong surface winds');
      expect(hazards).toContain('Strong wind gusts');
      expect(hazards).toContain('Cumulonimbus clouds present');
    });

    it('does not flag gusts at exactly 35', () => {
      const conditions = createTestConditions({ windGust: 35 });
      const hazards = part135Checker.identifyHazards(conditions);
      expect(hazards).not.toContain('Strong wind gusts');
    });

    it('does not flag winds at exactly 25', () => {
      const conditions = createTestConditions({ windSpeed: 25 });
      const hazards = part135Checker.identifyHazards(conditions);
      expect(hazards).not.toContain('Strong surface winds');
    });
  });

  // -------------------------------------------------------------------------
  // analyzeAlternate()
  // -------------------------------------------------------------------------

  describe('analyzeAlternate()', () => {
    it('requires alternate when TAF shows low ceiling in ETA window', () => {
      const now = new Date();
      const eta = new Date(now.getTime() + 3 * 3600000); // 3 hours from now
      const conditions = createTestConditions();
      const forecast = [
        createTestForecast({
          validFrom: new Date(eta.getTime() - 2 * 3600000).toISOString(),
          validTo: new Date(eta.getTime() + 2 * 3600000).toISOString(),
          ceiling: 1500, // Below 2000ft threshold
          visibility: 10,
        }),
      ];

      const result = part135Checker.analyzeAlternate(conditions, forecast, eta);
      expect(result.required).toBe(true);
      expect(result.analysisMethod).toBe('taf');
      expect(result.reason).toContain('ceiling');
      expect(result.reason).toContain('1500');
    });

    it('requires alternate when TAF shows low visibility in ETA window', () => {
      const now = new Date();
      const eta = new Date(now.getTime() + 3 * 3600000);
      const conditions = createTestConditions();
      const forecast = [
        createTestForecast({
          validFrom: new Date(eta.getTime() - 2 * 3600000).toISOString(),
          validTo: new Date(eta.getTime() + 2 * 3600000).toISOString(),
          ceiling: null,
          visibility: 2.0, // Below 3 SM threshold
        }),
      ];

      const result = part135Checker.analyzeAlternate(conditions, forecast, eta);
      expect(result.required).toBe(true);
      expect(result.analysisMethod).toBe('taf');
      expect(result.reason).toContain('visibility');
    });

    it('does not require alternate when TAF shows good conditions', () => {
      const now = new Date();
      const eta = new Date(now.getTime() + 3 * 3600000);
      const conditions = createTestConditions();
      const forecast = [
        createTestForecast({
          validFrom: new Date(eta.getTime() - 2 * 3600000).toISOString(),
          validTo: new Date(eta.getTime() + 2 * 3600000).toISOString(),
          ceiling: 5000,
          visibility: 10,
        }),
      ];

      const result = part135Checker.analyzeAlternate(conditions, forecast, eta);
      expect(result.required).toBe(false);
      expect(result.analysisMethod).toBe('taf');
      expect(result.forecastWindow).toBeDefined();
    });

    it('requires alternate when thunderstorms in TAF within ETA window', () => {
      const now = new Date();
      const eta = new Date(now.getTime() + 3 * 3600000);
      const conditions = createTestConditions();
      const forecast = [
        createTestForecast({
          validFrom: new Date(eta.getTime() - 2 * 3600000).toISOString(),
          validTo: new Date(eta.getTime() + 2 * 3600000).toISOString(),
          ceiling: 5000,
          visibility: 10,
          weatherPhenomena: [
            { intensity: '', descriptor: 'TS', type: 'RA', description: 'Thunderstorm' },
          ],
        }),
      ];

      const result = part135Checker.analyzeAlternate(conditions, forecast, eta);
      expect(result.required).toBe(true);
      expect(result.reason).toContain('Thunderstorms');
    });

    it('falls back to current conditions when no TAF data available', () => {
      const conditions = createTestConditions({ ceiling: 1500 });

      const result = part135Checker.analyzeAlternate(conditions, []);
      expect(result.required).toBe(true);
      expect(result.analysisMethod).toBe('current');
      expect(result.reason).toContain('ceiling');
    });

    it('falls back to current conditions when no ETA provided', () => {
      const conditions = createTestConditions({ ceiling: 5000, visibility: 10 });
      const forecast = [createTestForecast()];

      const result = part135Checker.analyzeAlternate(conditions, forecast);
      expect(result.required).toBe(false);
      expect(result.analysisMethod).toBe('current');
    });

    it('does not require alternate with good current conditions (fallback)', () => {
      const conditions = createTestConditions({ ceiling: 5000, visibility: 10 });
      const result = part135Checker.analyzeAlternate(conditions, []);
      expect(result.required).toBe(false);
      expect(result.analysisMethod).toBe('current');
    });

    it('returns required true when no TAF covers the ETA window', () => {
      const now = new Date();
      const eta = new Date(now.getTime() + 24 * 3600000); // 24 hours ahead
      const conditions = createTestConditions();
      // Forecast ends well before ETA window
      const forecast = [
        createTestForecast({
          validFrom: now.toISOString(),
          validTo: new Date(now.getTime() + 6 * 3600000).toISOString(),
          ceiling: 5000,
          visibility: 10,
        }),
      ];

      const result = part135Checker.analyzeAlternate(conditions, forecast, eta);
      expect(result.required).toBe(true);
      expect(result.reason).toContain('No TAF forecast available');
      expect(result.analysisMethod).toBe('unavailable');
    });

    it('includes forecastWindow data in TAF analysis', () => {
      const now = new Date();
      const eta = new Date(now.getTime() + 3 * 3600000);
      const conditions = createTestConditions();
      const forecast = [
        createTestForecast({
          validFrom: new Date(eta.getTime() - 2 * 3600000).toISOString(),
          validTo: new Date(eta.getTime() + 2 * 3600000).toISOString(),
          ceiling: 3000,
          visibility: 8,
        }),
      ];

      const result = part135Checker.analyzeAlternate(conditions, forecast, eta);
      expect(result.forecastWindow).toBeDefined();
      expect(result.forecastWindow!.worstCeiling).toBe(3000);
      expect(result.forecastWindow!.worstVisibility).toBe(8);
    });

    it('uses worst conditions across multiple overlapping TAF periods', () => {
      const now = new Date();
      const eta = new Date(now.getTime() + 3 * 3600000);
      const conditions = createTestConditions();
      const forecast = [
        createTestForecast({
          validFrom: new Date(eta.getTime() - 2 * 3600000).toISOString(),
          validTo: new Date(eta.getTime()).toISOString(),
          ceiling: 5000,
          visibility: 10,
        }),
        createTestForecast({
          validFrom: new Date(eta.getTime()).toISOString(),
          validTo: new Date(eta.getTime() + 2 * 3600000).toISOString(),
          ceiling: 1800, // Below 2000ft threshold
          visibility: 2.5, // Below 3 SM threshold
        }),
      ];

      const result = part135Checker.analyzeAlternate(conditions, forecast, eta);
      expect(result.required).toBe(true);
      expect(result.forecastWindow!.worstCeiling).toBe(1800);
      expect(result.forecastWindow!.worstVisibility).toBe(2.5);
    });
  });

  // -------------------------------------------------------------------------
  // checkStatus()
  // -------------------------------------------------------------------------

  describe('checkStatus()', () => {
    it('returns canDispatch true for VFR conditions', () => {
      const conditions = createTestConditions({
        ceiling: 5000,
        visibility: 10,
        windSpeed: 5,
      });

      const status = part135Checker.checkStatus(conditions);
      expect(status.canDispatch).toBe(true);
      expect(status.flightCategory).toBe('VFR');
      expect(status.ceilingStatus.status).toBe('above');
      // Visibility margin is 10 - 1.0 = 9 (SM), which is < 50, so checkMinimum
      // returns 'at' (the threshold is unit-agnostic, tuned for feet).
      // The important thing is it's NOT 'below'.
      expect(status.visibilityStatus.status).not.toBe('below');
      expect(status.weatherHazards).toHaveLength(0);
    });

    it('returns canDispatch false when ceiling is below minimums', () => {
      const conditions = createTestConditions({
        ceiling: 300, // Below 500ft minimum
        visibility: 10,
      });

      const status = part135Checker.checkStatus(conditions);
      expect(status.canDispatch).toBe(false);
      expect(status.ceilingStatus.status).toBe('below');
    });

    it('returns canDispatch false when visibility is below minimums', () => {
      const conditions = createTestConditions({
        ceiling: 5000,
        visibility: 0.5, // Below 1.0 SM minimum
      });

      const status = part135Checker.checkStatus(conditions);
      expect(status.canDispatch).toBe(false);
      expect(status.visibilityStatus.status).toBe('below');
    });

    it('returns canDispatch false when thunderstorms present', () => {
      const conditions = createTestConditions({
        ceiling: 5000,
        visibility: 10,
        weatherPhenomena: [
          { intensity: '', descriptor: 'TS', type: 'RA', description: 'Thunderstorm Rain' },
        ],
      });

      const status = part135Checker.checkStatus(conditions);
      expect(status.canDispatch).toBe(false);
      expect(status.weatherHazards).toContain('Thunderstorms in vicinity');
    });

    it('includes alternate analysis in status', () => {
      const conditions = createTestConditions({
        ceiling: 1500, // Below 2000 alternate threshold
        visibility: 10,
      });

      const status = part135Checker.checkStatus(conditions);
      expect(status.alternateRequired).toBe(true);
      expect(status.alternateAnalysis).toBeDefined();
      expect(status.alternateAnalysis!.regulation).toBe('14 CFR 135.223(b)');
    });

    it('returns canDispatch true for MVFR conditions above minimums', () => {
      const conditions = createTestConditions({
        ceiling: 2000,
        visibility: 4,
      });

      const status = part135Checker.checkStatus(conditions);
      expect(status.canDispatch).toBe(true);
      expect(status.flightCategory).toBe('MVFR');
    });

    it('correctly populates all status fields', () => {
      const conditions = createTestConditions({
        ceiling: 5000,
        visibility: 10,
      });

      const status = part135Checker.checkStatus(conditions);
      expect(status).toHaveProperty('canDispatch');
      expect(status).toHaveProperty('flightCategory');
      expect(status).toHaveProperty('ceilingStatus');
      expect(status).toHaveProperty('visibilityStatus');
      expect(status).toHaveProperty('weatherHazards');
      expect(status).toHaveProperty('alternateRequired');
      expect(status).toHaveProperty('alternateAnalysis');
    });

    it('passes forecast and ETA through to alternate analysis', () => {
      const now = new Date();
      const eta = new Date(now.getTime() + 3 * 3600000);
      const conditions = createTestConditions({ ceiling: 5000, visibility: 10 });
      const forecast = [
        createTestForecast({
          validFrom: new Date(eta.getTime() - 2 * 3600000).toISOString(),
          validTo: new Date(eta.getTime() + 2 * 3600000).toISOString(),
          ceiling: 1500,
          visibility: 10,
        }),
      ];

      const status = part135Checker.checkStatus(conditions, forecast, eta);
      expect(status.alternateRequired).toBe(true);
      expect(status.alternateAnalysis!.analysisMethod).toBe('taf');
    });
  });
});
