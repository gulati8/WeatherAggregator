import axios from 'axios';
import { UnifiedWeatherData } from '../types/weather';
import { Trip, TripInput, TripLegInput, TripWeatherResponse } from '../types/trip';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

export interface RawWeatherData {
  icao: string;
  metar: string | null;
  taf: string | null;
  timestamp: string;
}

export interface GetWeatherOptions {
  refresh?: boolean;
  targetTime?: Date;
}

export const weatherApi = {
  // Get aggregated weather for an airport
  // Optional targetTime for flight planning at a specific time
  getWeather: async (
    icao: string,
    options: GetWeatherOptions = {}
  ): Promise<UnifiedWeatherData> => {
    const params: Record<string, string> = {};
    if (options.refresh) {
      params.refresh = 'true';
    }
    if (options.targetTime) {
      params.time = options.targetTime.toISOString();
    }
    const response = await api.get<UnifiedWeatherData>(`/weather/${icao}`, {
      params,
    });
    return response.data;
  },

  // Get raw METAR and TAF strings
  getRawWeather: async (icao: string): Promise<RawWeatherData> => {
    const response = await api.get<RawWeatherData>(`/weather/${icao}/raw`);
    return response.data;
  },

  // Health check
  healthCheck: async (): Promise<{ status: string; timestamp: string }> => {
    const response = await api.get('/health');
    return response.data;
  },
};

// Convert Trip to TripInput for API
const tripToInput = (trip: Trip): TripInput => ({
  tripId: trip.tripId,
  name: trip.name,
  legs: trip.legs.map((leg): TripLegInput => ({
    legId: leg.legId,
    departureAirport: leg.departureAirport,
    arrivalAirport: leg.arrivalAirport,
    departureTime: leg.departureTime.toISOString(),
    estimatedFlightMinutes: leg.estimatedFlightMinutes,
  })),
});

export const tripApi = {
  // Get weather for a multi-leg trip
  getTripWeather: async (trip: Trip): Promise<TripWeatherResponse> => {
    const input = tripToInput(trip);
    const response = await api.post<TripWeatherResponse>('/trip', input);
    return response.data;
  },
};

export default api;
