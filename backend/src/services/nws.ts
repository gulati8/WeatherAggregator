import axios from 'axios';
import { config } from '../config';

export interface NwsPointResponse {
  properties: {
    gridId: string;
    gridX: number;
    gridY: number;
    forecast: string;
    forecastHourly: string;
    forecastGridData: string;
    observationStations: string;
    relativeLocation: {
      properties: {
        city: string;
        state: string;
      };
    };
  };
}

export interface NwsAlertResponse {
  features: NwsAlert[];
}

export interface NwsAlert {
  properties: {
    id: string;
    areaDesc: string;
    sent: string;
    effective: string;
    onset: string;
    expires: string;
    ends: string;
    status: string;
    messageType: string;
    severity: string;
    certainty: string;
    urgency: string;
    event: string;
    headline: string;
    description: string;
    instruction: string;
  };
}

export interface NwsForecastResponse {
  properties: {
    updated: string;
    periods: NwsForecastPeriod[];
  };
}

export interface NwsForecastPeriod {
  number: number;
  name: string;
  startTime: string;
  endTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  temperatureTrend: string | null;
  windSpeed: string;
  windDirection: string;
  shortForecast: string;
  detailedForecast: string;
  probabilityOfPrecipitation?: {
    value: number | null;
  };
}

class NwsService {
  private baseUrl = config.apis.nws.baseUrl;
  private userAgent = config.apis.nws.userAgent;

  private async request<T>(url: string): Promise<T> {
    const response = await axios.get<T>(url, {
      headers: {
        'User-Agent': this.userAgent,
        Accept: 'application/geo+json',
      },
      timeout: 10000,
    });
    return response.data;
  }

  async getPoint(lat: number, lon: number): Promise<NwsPointResponse | null> {
    try {
      // Round to 4 decimal places as required by NWS
      const roundedLat = Math.round(lat * 10000) / 10000;
      const roundedLon = Math.round(lon * 10000) / 10000;

      return await this.request<NwsPointResponse>(
        `${this.baseUrl}/points/${roundedLat},${roundedLon}`
      );
    } catch (error) {
      console.error('NWS point fetch error:', error);
      return null;
    }
  }

  async getAlerts(lat: number, lon: number): Promise<NwsAlert[]> {
    try {
      const roundedLat = Math.round(lat * 10000) / 10000;
      const roundedLon = Math.round(lon * 10000) / 10000;

      const response = await this.request<NwsAlertResponse>(
        `${this.baseUrl}/alerts/active?point=${roundedLat},${roundedLon}`
      );
      return response.features || [];
    } catch (error) {
      console.error('NWS alerts fetch error:', error);
      return [];
    }
  }

  async getForecast(lat: number, lon: number): Promise<NwsForecastPeriod[]> {
    try {
      const point = await this.getPoint(lat, lon);
      if (!point) {
        return [];
      }

      const forecastResponse = await this.request<NwsForecastResponse>(
        point.properties.forecast
      );
      return forecastResponse.properties.periods || [];
    } catch (error) {
      console.error('NWS forecast fetch error:', error);
      return [];
    }
  }

  // Map NWS severity to our severity levels
  mapSeverity(nwsSeverity: string): 'info' | 'warning' | 'danger' {
    switch (nwsSeverity.toLowerCase()) {
      case 'extreme':
      case 'severe':
        return 'danger';
      case 'moderate':
        return 'warning';
      default:
        return 'info';
    }
  }

  // Parse wind speed from NWS format (e.g., "10 to 15 mph")
  parseWindSpeed(windStr: string): number {
    const match = windStr.match(/(\d+)/);
    if (match) {
      // Convert mph to knots
      return parseInt(match[1]) * 0.868976;
    }
    return 0;
  }

  // Parse wind direction from NWS format (e.g., "NW")
  parseWindDirection(dirStr: string): number {
    const directions: Record<string, number> = {
      N: 0,
      NNE: 22.5,
      NE: 45,
      ENE: 67.5,
      E: 90,
      ESE: 112.5,
      SE: 135,
      SSE: 157.5,
      S: 180,
      SSW: 202.5,
      SW: 225,
      WSW: 247.5,
      W: 270,
      WNW: 292.5,
      NW: 315,
      NNW: 337.5,
    };
    return directions[dirStr.toUpperCase()] ?? 0;
  }
}

export const nwsService = new NwsService();
