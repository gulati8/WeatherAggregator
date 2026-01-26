import axios from 'axios';
import { config } from '../config';

export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  hourly_units: {
    time: string;
    temperature_2m: string;
    relative_humidity_2m: string;
    precipitation_probability: string;
    precipitation: string;
    cloud_cover: string;
    visibility: string;
    wind_speed_10m: string;
    wind_direction_10m: string;
    wind_gusts_10m: string;
  };
  hourly: {
    time: string[];
    temperature_2m: (number | null)[];
    relative_humidity_2m: (number | null)[];
    precipitation_probability: (number | null)[];
    precipitation: (number | null)[];
    cloud_cover: (number | null)[];
    visibility: (number | null)[];
    wind_speed_10m: (number | null)[];
    wind_direction_10m: (number | null)[];
    wind_gusts_10m: (number | null)[];
  };
}

class OpenMeteoService {
  private baseUrl = config.apis.openMeteo.baseUrl;

  async getForecast(lat: number, lon: number): Promise<OpenMeteoResponse | null> {
    try {
      const response = await axios.get<OpenMeteoResponse>(
        `${this.baseUrl}/forecast`,
        {
          params: {
            latitude: lat,
            longitude: lon,
            hourly: [
              'temperature_2m',
              'relative_humidity_2m',
              'precipitation_probability',
              'precipitation',
              'cloud_cover',
              'visibility',
              'wind_speed_10m',
              'wind_direction_10m',
              'wind_gusts_10m',
            ].join(','),
            forecast_days: 3,
            timezone: 'UTC',
          },
          timeout: 10000,
        }
      );

      return response.data;
    } catch (error) {
      console.error('Open-Meteo fetch error:', error);
      throw error;
    }
  }

  // Convert visibility from meters to statute miles
  visibilityToStatuteMiles(meters: number): number {
    return meters / 1609.344;
  }

  // Convert wind speed from km/h to knots
  windSpeedToKnots(kmh: number): number {
    return kmh * 0.539957;
  }

  // Convert temperature from Celsius (already in Celsius, just validate)
  temperatureCelsius(temp: number): number {
    return temp;
  }
}

export const openMeteoService = new OpenMeteoService();
