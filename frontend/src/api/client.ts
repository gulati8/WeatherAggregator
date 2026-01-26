import axios from 'axios';
import { UnifiedWeatherData } from '../types/weather';

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

export const weatherApi = {
  // Get aggregated weather for an airport
  getWeather: async (icao: string, refresh = false): Promise<UnifiedWeatherData> => {
    const params = refresh ? { refresh: 'true' } : {};
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

export default api;
