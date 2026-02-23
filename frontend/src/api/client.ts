import axios from 'axios';
import { UnifiedWeatherData } from '../types/weather';
import { Trip, TripInput, TripLegInput, TripWeatherResponse } from '../types/trip';
import { UserProfile, AuthTokens, LoginResponse } from '../types/auth';
import { AirportRecord } from '../types/airport';

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

// Auth API (uses separate axios instance to avoid interceptor loops)
const authAxios = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await authAxios.post<LoginResponse>('/auth/login', { email, password });
    return response.data;
  },

  register: async (email: string, password: string, name: string): Promise<LoginResponse> => {
    const response = await authAxios.post<LoginResponse>('/auth/register', { email, password, name });
    return response.data;
  },

  refresh: async (refreshToken: string): Promise<AuthTokens> => {
    const response = await authAxios.post<AuthTokens>('/auth/refresh', { refreshToken });
    return response.data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    const token = sessionStorage.getItem('weather-aggregator-access-token');
    await authAxios.post('/auth/logout', { refreshToken }, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  getMe: async (): Promise<UserProfile> => {
    const token = sessionStorage.getItem('weather-aggregator-access-token');
    const response = await api.get<UserProfile>('/auth/me', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },

  updateMe: async (data: { name?: string; email?: string }): Promise<UserProfile> => {
    const response = await api.put<UserProfile>('/auth/me', data);
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.put('/auth/password', { currentPassword, newPassword });
  },
};

export const favoritesApi = {
  getAll: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/favorites');
    return response.data;
  },

  add: async (icao: string): Promise<void> => {
    await api.post('/favorites', { icao });
  },

  remove: async (icao: string): Promise<void> => {
    await api.delete(`/favorites/${icao}`);
  },
};

export const preferencesApi = {
  get: async (): Promise<{ darkMode: boolean; recentSearches: string[] }> => {
    const response = await api.get('/preferences');
    return response.data;
  },

  update: async (data: { darkMode?: boolean; recentSearches?: string[] }): Promise<void> => {
    await api.put('/preferences', data);
  },
};

export const savedTripsApi = {
  getAll: async (): Promise<unknown[]> => {
    const response = await api.get('/trip/saved');
    return response.data;
  },

  save: async (trip: { tripId: string; name?: string; legs: unknown }): Promise<unknown> => {
    const response = await api.post('/trip/saved', trip);
    return response.data;
  },

  update: async (tripId: string, data: { name?: string; legs?: unknown }): Promise<unknown> => {
    const response = await api.put(`/trip/saved/${tripId}`, data);
    return response.data;
  },

  delete: async (tripId: string): Promise<void> => {
    await api.delete(`/trip/saved/${tripId}`);
  },
};

export const usersApi = {
  list: async (): Promise<UserProfile[]> => {
    const response = await api.get<UserProfile[]>('/users');
    return response.data;
  },

  updateRole: async (userId: string, role: string): Promise<UserProfile> => {
    const response = await api.put<UserProfile>(`/users/${userId}/role`, { role });
    return response.data;
  },

  delete: async (userId: string): Promise<void> => {
    await api.delete(`/users/${userId}`);
  },
};

export const airportsApi = {
  search: async (query: string, limit = 8): Promise<AirportRecord[]> => {
    const response = await api.get<AirportRecord[]>('/airports/search', {
      params: { q: query, limit },
    });
    return response.data;
  },
};

export default api;
