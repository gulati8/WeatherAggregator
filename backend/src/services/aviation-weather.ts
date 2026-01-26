import axios from 'axios';
import { config } from '../config';
import { cacheService } from './cache';

// AWC API response types
export interface AwcMetarResponse {
  metar_id: number;
  icaoId: string;
  receiptTime: string;
  obsTime: number;
  reportTime: string;
  temp: number | null;
  dewp: number | null;
  wdir: number | string | null;
  wspd: number | null;
  wgst: number | null;
  visib: string | number | null;
  altim: number | null;
  slp: number | null;
  qcField: number;
  wxString: string | null;
  presTend: number | null;
  maxT: number | null;
  minT: number | null;
  maxT24: number | null;
  minT24: number | null;
  precip: number | null;
  pcp3hr: number | null;
  pcp6hr: number | null;
  pcp24hr: number | null;
  snow: number | null;
  vertVis: number | null;
  metarType: string;
  rawOb: string;
  mostRecent: number;
  lat: number;
  lon: number;
  elev: number;
  prior: number;
  name: string;
  clouds: AwcCloud[] | null;
}

export interface AwcCloud {
  cover: string;
  base: number | null;
  type?: string;
}

export interface AwcTafResponse {
  tafId: number;
  icaoId: string;
  dbPopTime: string;
  bulletinTime: string;
  issueTime: string;
  validTimeFrom: number;
  validTimeTo: number;
  rawTAF: string;
  mostRecent: number;
  remarks: string | null;
  lat: number;
  lon: number;
  elev: number;
  prior: number;
  name: string;
  fcsts: AwcTafForecast[];
}

export interface AwcTafForecast {
  timeGroup: number;
  timeFrom: number;
  timeTo: number;
  timeBec: number | null;
  fcstChange: string | null;
  probability: number | null;
  wdir: number | string | null;
  wspd: number | null;
  wgst: number | null;
  wshearHgt: number | null;
  wshearDir: number | null;
  wshearSpd: number | null;
  visib: string | number | null;
  altim: number | null;
  vertVis: number | null;
  wxString: string | null;
  notDecoded: string | null;
  clouds: AwcCloud[] | null;
  icgTurb: unknown[] | null;
  temp: unknown[] | null;
}

class AviationWeatherService {
  private baseUrl = config.apis.aviationWeather.baseUrl;

  async getMetar(icao: string): Promise<AwcMetarResponse | null> {
    const cached = cacheService.getMetar<AwcMetarResponse>(icao);
    if (cached) {
      return cached;
    }

    try {
      const response = await axios.get<AwcMetarResponse[]>(
        `${this.baseUrl}/metar`,
        {
          params: {
            ids: icao.toUpperCase(),
            format: 'json',
          },
          timeout: 10000,
        }
      );

      if (response.data && response.data.length > 0) {
        const metar = response.data[0];
        cacheService.setMetar(icao, metar);
        return metar;
      }

      return null;
    } catch (error) {
      console.error(`AWC METAR fetch error for ${icao}:`, error);
      throw error;
    }
  }

  async getTaf(icao: string): Promise<AwcTafResponse | null> {
    const cached = cacheService.getTaf<AwcTafResponse>(icao);
    if (cached) {
      return cached;
    }

    try {
      const response = await axios.get<AwcTafResponse[]>(
        `${this.baseUrl}/taf`,
        {
          params: {
            ids: icao.toUpperCase(),
            format: 'json',
          },
          timeout: 10000,
        }
      );

      if (response.data && response.data.length > 0) {
        const taf = response.data[0];
        cacheService.setTaf(icao, taf);
        return taf;
      }

      return null;
    } catch (error) {
      console.error(`AWC TAF fetch error for ${icao}:`, error);
      throw error;
    }
  }

  async getMetarAndTaf(
    icao: string
  ): Promise<{ metar: AwcMetarResponse | null; taf: AwcTafResponse | null }> {
    const [metar, taf] = await Promise.all([
      this.getMetar(icao).catch(() => null),
      this.getTaf(icao).catch(() => null),
    ]);

    return { metar, taf };
  }
}

export const aviationWeatherService = new AviationWeatherService();
