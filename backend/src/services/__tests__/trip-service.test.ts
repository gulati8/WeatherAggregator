import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UnifiedWeatherData, FlightCategory } from '../../types/weather';

// ---------------------------------------------------------------------------
// Mock the weather aggregator
// ---------------------------------------------------------------------------

vi.mock('../weather-aggregator', () => ({
  weatherAggregator: {
    getAggregatedWeather: vi.fn(),
  },
}));

import { tripService } from '../trip-service';
import { weatherAggregator } from '../weather-aggregator';
import { TripInput } from '../../types/trip';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockWeatherData(overrides: {
  canDispatch?: boolean;
  flightCategory?: FlightCategory;
  hazards?: string[];
  alternateRequired?: boolean;
  agreement?: 'strong' | 'moderate' | 'weak';
} = {}): UnifiedWeatherData {
  const flightCategory = overrides.flightCategory || 'VFR';
  return {
    airport: {
      icao: 'KJFK',
      name: 'Test Airport',
      city: 'Test',
      country: 'US',
      latitude: 40.6,
      longitude: -73.7,
      elevation: 13,
    },
    timestamp: new Date().toISOString(),
    sources: [
      { id: 'awc', name: 'AWC', lastUpdated: new Date().toISOString(), status: 'ok' },
    ],
    current: {
      observationTime: new Date().toISOString(),
      temperature: { value: 15, bySource: {}, confidence: 'high' },
      dewpoint: { value: 8, bySource: {}, confidence: 'high' },
      humidity: { value: 50, bySource: {}, confidence: 'high' },
      pressure: { value: 29.92, bySource: {}, confidence: 'high' },
      windDirection: { value: 270, bySource: {}, confidence: 'high' },
      windSpeed: { value: 10, bySource: {}, confidence: 'high' },
      windGust: { value: null, bySource: {}, confidence: 'high' },
      visibility: { value: 10, bySource: {}, confidence: 'high' },
      ceiling: { value: 5000, bySource: {}, confidence: 'high' },
      cloudLayers: [{ coverage: 'SCT', base: 5000 }],
      weatherPhenomena: [],
      flightCategory: { value: flightCategory, bySource: {}, confidence: 'high' },
    },
    forecast: [],
    consensus: {
      overallAgreement: overrides.agreement || 'strong',
      disagreementAreas: [],
      confidenceScore: 90,
    },
    part135Status: {
      canDispatch: overrides.canDispatch !== undefined ? overrides.canDispatch : true,
      flightCategory,
      ceilingStatus: { value: 5000, minimum: 500, margin: 4500, status: 'above' },
      visibilityStatus: { value: 10, minimum: 1, margin: 9, status: 'above' },
      weatherHazards: overrides.hazards || [],
      alternateRequired: overrides.alternateRequired || false,
    },
    alerts: [],
    pireps: [],
    airSigmets: [],
  };
}

function createTestTrip(legOverrides: Partial<TripInput['legs'][0]>[] = [{}]): TripInput {
  const now = new Date();
  return {
    tripId: 'test-trip-1',
    name: 'Test Trip',
    legs: legOverrides.map((override, i) => ({
      legId: `leg-${i + 1}`,
      departureAirport: 'KJFK',
      arrivalAirport: 'KLAX',
      departureTime: now.toISOString(),
      estimatedFlightMinutes: 300,
      ...override,
    })),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TripService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a valid trip weather response', async () => {
    const weather = createMockWeatherData();
    vi.mocked(weatherAggregator.getAggregatedWeather).mockResolvedValue(weather);

    const trip = createTestTrip();
    const result = await tripService.getTripWeather(trip);

    expect(result.tripId).toBe('test-trip-1');
    expect(result.name).toBe('Test Trip');
    expect(result.legs).toHaveLength(1);
    expect(result.summary).toBeDefined();
  });

  it('deduplicates airport+time combinations', async () => {
    const weather = createMockWeatherData();
    vi.mocked(weatherAggregator.getAggregatedWeather).mockResolvedValue(weather);

    const now = new Date();
    // Leg 1: KJFK → KLAX, departs now, arrives now+300min
    // Leg 2: KLAX → KORD, departs now+300min, arrives now+300+180min
    // KLAX arrival of leg 1 = KLAX departure of leg 2 = now+300min (same time!)
    // So unique requests: KJFK@now, KLAX@(now+300), KORD@(now+480) = 3
    const trip = createTestTrip([
      {
        legId: 'leg-1',
        departureAirport: 'KJFK',
        arrivalAirport: 'KLAX',
        departureTime: now.toISOString(),
        estimatedFlightMinutes: 300,
      },
      {
        legId: 'leg-2',
        departureAirport: 'KLAX',
        arrivalAirport: 'KORD',
        departureTime: new Date(now.getTime() + 300 * 60 * 1000).toISOString(),
        estimatedFlightMinutes: 180,
      },
    ]);

    await tripService.getTripWeather(trip);

    // KLAX@arrival1 and KLAX@dep2 are same time → deduplicated → 3 calls
    expect(weatherAggregator.getAggregatedWeather).toHaveBeenCalledTimes(3);
  });

  it('calculates arrival time correctly', async () => {
    const weather = createMockWeatherData();
    vi.mocked(weatherAggregator.getAggregatedWeather).mockResolvedValue(weather);

    const now = new Date();
    const trip = createTestTrip([{
      departureTime: now.toISOString(),
      estimatedFlightMinutes: 120,
    }]);

    const result = await tripService.getTripWeather(trip);
    const arrivalTime = new Date(result.legs[0].arrivalTime);
    const expected = new Date(now.getTime() + 120 * 60 * 1000);

    expect(arrivalTime.getTime()).toBe(expected.getTime());
  });

  it('returns GO summary when all legs are clear', async () => {
    const weather = createMockWeatherData({ canDispatch: true, flightCategory: 'VFR' });
    vi.mocked(weatherAggregator.getAggregatedWeather).mockResolvedValue(weather);

    const trip = createTestTrip();
    const result = await tripService.getTripWeather(trip);

    expect(result.summary.overallStatus).toBe('GO');
    expect(result.summary.goLegs).toBe(1);
    expect(result.summary.noGoLegs).toBe(0);
  });

  it('returns NO-GO summary when a leg cannot dispatch', async () => {
    const weather = createMockWeatherData({
      canDispatch: false,
      flightCategory: 'LIFR',
    });
    vi.mocked(weatherAggregator.getAggregatedWeather).mockResolvedValue(weather);

    const trip = createTestTrip();
    const result = await tripService.getTripWeather(trip);

    expect(result.summary.overallStatus).toBe('NO-GO');
    expect(result.summary.noGoLegs).toBe(1);
  });

  it('returns CAUTION summary when leg is dispatchable but has warnings', async () => {
    const weather = createMockWeatherData({
      canDispatch: true,
      flightCategory: 'IFR',
    });
    vi.mocked(weatherAggregator.getAggregatedWeather).mockResolvedValue(weather);

    const trip = createTestTrip();
    const result = await tripService.getTripWeather(trip);

    expect(result.summary.overallStatus).toBe('CAUTION');
    expect(result.summary.cautionLegs).toBe(1);
  });

  it('tracks worst flight category across legs', async () => {
    let callCount = 0;
    vi.mocked(weatherAggregator.getAggregatedWeather).mockImplementation(async () => {
      callCount++;
      // First two calls (dep/arr of leg 1) = VFR
      // Next two calls (dep/arr of leg 2) = IFR
      if (callCount <= 2) {
        return createMockWeatherData({ flightCategory: 'VFR' });
      }
      return createMockWeatherData({ flightCategory: 'IFR' });
    });

    const trip = createTestTrip([
      { legId: 'leg-1', departureAirport: 'KJFK', arrivalAirport: 'KLAX' },
      { legId: 'leg-2', departureAirport: 'KLAX', arrivalAirport: 'KORD' },
    ]);

    const result = await tripService.getTripWeather(trip);

    expect(result.summary.worstFlightCategory).toBe('IFR');
  });

  it('handles weather fetch failures gracefully', async () => {
    // First call succeeds, second fails
    vi.mocked(weatherAggregator.getAggregatedWeather)
      .mockResolvedValueOnce(createMockWeatherData())
      .mockRejectedValueOnce(new Error('Network error'));

    const trip = createTestTrip();
    const result = await tripService.getTripWeather(trip);

    // Should still return a response — missing weather causes issues/warnings
    expect(result).toBeDefined();
    expect(result.legs).toHaveLength(1);
  });

  it('tracks multi-source agreement in summary', async () => {
    const weather = createMockWeatherData({ agreement: 'weak' });
    vi.mocked(weatherAggregator.getAggregatedWeather).mockResolvedValue(weather);

    const trip = createTestTrip();
    const result = await tripService.getTripWeather(trip);

    expect(result.summary.multiSourceAgreement).toBe('weak');
  });
});
