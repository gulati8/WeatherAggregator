import axios from 'axios';
import { config } from '../config';
import { cacheService } from './cache';
import { awcRateLimiter } from './rate-limiter';

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

// PIREP response types
export interface AwcPirep {
  pirepId: number;
  receiptTime: string;
  obsTime: number;
  reportTime: string;
  lat: number;
  lon: number;
  fltlvl: number; // Flight level in hundreds of feet
  fltlvlType: string;
  acType: string; // Aircraft type
  rawOb: string;
  wxString: string | null;
  turb: AwcTurbIcing[] | null;
  ice: AwcTurbIcing[] | null;
  sky: AwcPirepSky[] | null;
}

export interface AwcTurbIcing {
  type: string;
  intensity: string;
  minAltFt: number | null;
  maxAltFt: number | null;
}

export interface AwcPirepSky {
  cover: string;
  base: number | null;
  top: number | null;
}

// AIRMET/SIGMET response types
export interface AwcAirSigmet {
  airSigmetId: number;
  icaoId: string;
  airSigmetType: string; // SIGMET, AIRMET, etc.
  bulletinTime: string;
  validTimeFrom: number;
  validTimeTo: number;
  rawAirSigmet: string;
  hazard: string; // TURB, ICE, IFR, MTN OBSCN, CONVECTIVE
  severity: string;
  altLow: number | null;
  altHi: number | null;
  coords: Array<{ lat: number; lon: number }>;
}

class AviationWeatherService {
  private baseUrl = config.apis.aviationWeather.baseUrl;

  async getMetar(icao: string): Promise<AwcMetarResponse | null> {
    const cached = cacheService.getMetar<AwcMetarResponse>(icao);
    if (cached) {
      return cached;
    }

    try {
      await awcRateLimiter.acquire();
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
      await awcRateLimiter.acquire();
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

  async getRecentMetars(icao: string, hours: number = 3): Promise<AwcMetarResponse[]> {
    try {
      await awcRateLimiter.acquire();
      const response = await axios.get<AwcMetarResponse[]>(
        `${this.baseUrl}/metar`,
        {
          params: {
            ids: icao.toUpperCase(),
            format: 'json',
            hours,
          },
          timeout: 10000,
        }
      );

      if (response.data && Array.isArray(response.data)) {
        // Sort newest first; skip the most recent (it's the current METAR)
        return response.data
          .sort((a, b) => b.obsTime - a.obsTime)
          .slice(1);
      }

      return [];
    } catch (error) {
      console.error(`AWC recent METARs fetch error for ${icao}:`, error);
      return [];
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

  async getPireps(lat: number, lon: number, radiusNm: number = 100): Promise<AwcPirep[]> {
    try {
      // Approximate: 1 degree latitude ~ 60 nm
      const degreeRadius = radiusNm / 60;
      const minLon = lon - degreeRadius;
      const minLat = lat - degreeRadius;
      const maxLon = lon + degreeRadius;
      const maxLat = lat + degreeRadius;

      await awcRateLimiter.acquire();
      const response = await axios.get<AwcPirep[]>(
        `${this.baseUrl}/pirep`,
        {
          params: {
            bbox: `${minLon},${minLat},${maxLon},${maxLat}`,
            format: 'json',
          },
          timeout: 10000,
        }
      );

      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }

      return [];
    } catch (error) {
      console.error('AWC PIREP fetch error:', error);
      return [];
    }
  }

  async getAirSigmets(lat: number, lon: number): Promise<AwcAirSigmet[]> {
    try {
      await awcRateLimiter.acquire();
      const response = await axios.get<AwcAirSigmet[]>(
        `${this.baseUrl}/airsigmet`,
        {
          params: {
            format: 'json',
          },
          timeout: 10000,
        }
      );

      if (response.data && Array.isArray(response.data)) {
        // Filter results by proximity to lat/lon (within ~200nm)
        const maxDistDeg = 200 / 60;
        return response.data.filter((item) => {
          // Check if any of the coordinates are within range
          if (item.coords && item.coords.length > 0) {
            return item.coords.some(
              (coord) =>
                Math.abs(coord.lat - lat) <= maxDistDeg &&
                Math.abs(coord.lon - lon) <= maxDistDeg
            );
          }
          return false;
        });
      }

      return [];
    } catch (error) {
      console.error('AWC AirSigmet fetch error:', error);
      return [];
    }
  }
}

export const aviationWeatherService = new AviationWeatherService();
