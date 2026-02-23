import axios from 'axios';
import { config } from '../config';
import { FlightCategory } from '../types/weather';
import { part135Checker } from './part135-checker';

export interface RouteWaypoint {
  lat: number;
  lon: number;
  distanceNm: number; // from departure
}

export interface RouteWeatherPoint {
  lat: number;
  lon: number;
  distanceNm: number;
  temperature: number;
  windSpeed: number;
  windDirection: number;
  visibility: number; // statute miles
  cloudCover: number; // percent
  precipitationProb: number;
  flightCategory: FlightCategory;
  hazards: string[];
}

export interface RouteHazardSegment {
  fromDistanceNm: number;
  toDistanceNm: number;
  hazard: string;
}

export interface RouteWeather {
  departure: { icao: string; lat: number; lon: number };
  arrival: { icao: string; lat: number; lon: number };
  totalDistanceNm: number;
  points: RouteWeatherPoint[];
  summary: {
    worstCategory: FlightCategory;
    hasThunderstorms: boolean;
    hasIcing: boolean;
    hasTurbulence: boolean;
    hazardSegments: RouteHazardSegment[];
  };
}

function toRadians(deg: number): number {
  return deg * Math.PI / 180;
}

function toDegrees(rad: number): number {
  return rad * 180 / Math.PI;
}

/**
 * Calculate great circle distance between two points in nautical miles.
 */
function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Earth radius in nautical miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Interpolate points along a great circle route.
 */
function calculateRoutePoints(
  depLat: number, depLon: number,
  arrLat: number, arrLon: number,
  intervalNm: number = 100
): RouteWaypoint[] {
  const totalDist = haversineNm(depLat, depLon, arrLat, arrLon);
  const numPoints = Math.max(2, Math.ceil(totalDist / intervalNm) + 1);

  const waypoints: RouteWaypoint[] = [];
  const lat1 = toRadians(depLat);
  const lon1 = toRadians(depLon);
  const lat2 = toRadians(arrLat);
  const lon2 = toRadians(arrLon);

  const d = toRadians(totalDist / 3440.065 * 180 / Math.PI); // angular distance

  for (let i = 0; i < numPoints; i++) {
    const f = i / (numPoints - 1);

    // Spherical interpolation
    const a = Math.sin((1 - f) * d) / Math.sin(d);
    const b = Math.sin(f * d) / Math.sin(d);

    const x = a * Math.cos(lat1) * Math.cos(lon1) + b * Math.cos(lat2) * Math.cos(lon2);
    const y = a * Math.cos(lat1) * Math.sin(lon1) + b * Math.cos(lat2) * Math.sin(lon2);
    const z = a * Math.sin(lat1) + b * Math.sin(lat2);

    const lat = toDegrees(Math.atan2(z, Math.sqrt(x * x + y * y)));
    const lon = toDegrees(Math.atan2(y, x));

    waypoints.push({
      lat,
      lon,
      distanceNm: f * totalDist,
    });
  }

  return waypoints;
}

class RouteWeatherService {
  async getRouteWeather(
    depLat: number, depLon: number,
    arrLat: number, arrLon: number,
    depIcao: string, arrIcao: string,
    _targetTime?: Date
  ): Promise<RouteWeather> {
    const waypoints = calculateRoutePoints(depLat, depLon, arrLat, arrLon);
    const totalDistanceNm = waypoints.length > 0
      ? waypoints[waypoints.length - 1].distanceNm
      : haversineNm(depLat, depLon, arrLat, arrLon);

    // Fetch Open-Meteo weather for all waypoints in bulk
    const lats = waypoints.map((w) => w.lat.toFixed(4)).join(',');
    const lons = waypoints.map((w) => w.lon.toFixed(4)).join(',');

    let openMeteoData: Array<{
      temperature: number;
      windspeed: number;
      winddirection: number;
      visibility: number;
      cloudcover: number;
      precipitation_probability: number;
    }> = [];

    try {
      // Open-Meteo supports multiple locations via comma-separated coords
      const promises = waypoints.map(async (wp) => {
        const response = await axios.get(`${config.apis.openMeteo.baseUrl}/forecast`, {
          params: {
            latitude: wp.lat.toFixed(4),
            longitude: wp.lon.toFixed(4),
            current: 'temperature_2m,wind_speed_10m,wind_direction_10m,cloud_cover,precipitation_probability',
            hourly: 'visibility',
            forecast_days: 1,
          },
          timeout: 10000,
        });

        const current = response.data?.current;
        const hourlyVis = response.data?.hourly?.visibility?.[0];

        return {
          temperature: current?.temperature_2m ?? 15,
          windspeed: current?.wind_speed_10m ?? 0,
          winddirection: current?.wind_direction_10m ?? 0,
          visibility: hourlyVis ? hourlyVis / 1609.344 : 10, // meters to SM
          cloudcover: current?.cloud_cover ?? 0,
          precipitation_probability: current?.precipitation_probability ?? 0,
        };
      });

      openMeteoData = await Promise.all(promises);
    } catch {
      // Fill with defaults on failure
      openMeteoData = waypoints.map(() => ({
        temperature: 15,
        windspeed: 0,
        winddirection: 0,
        visibility: 10,
        cloudcover: 0,
        precipitation_probability: 0,
      }));
    }

    // Build route weather points
    const points: RouteWeatherPoint[] = waypoints.map((wp, i) => {
      const wx = openMeteoData[i];
      const windKts = wx.windspeed * 0.539957;
      const visSm = Math.max(0.1, wx.visibility);
      const flightCategory = part135Checker.categorize(null, visSm);

      const hazards: string[] = [];
      if (wx.precipitation_probability > 60) hazards.push('Precipitation likely');
      if (windKts > 25) hazards.push('Strong winds');
      if (visSm < 3) hazards.push('Low visibility');
      if (wx.cloudcover > 80 && visSm < 5) hazards.push('IFR conditions possible');

      return {
        lat: wp.lat,
        lon: wp.lon,
        distanceNm: wp.distanceNm,
        temperature: wx.temperature,
        windSpeed: Math.round(windKts),
        windDirection: wx.winddirection,
        visibility: Math.round(visSm * 10) / 10,
        cloudCover: wx.cloudcover,
        precipitationProb: wx.precipitation_probability,
        flightCategory,
        hazards,
      };
    });

    // Build summary
    const categoryRank: Record<FlightCategory, number> = { LIFR: 0, IFR: 1, MVFR: 2, VFR: 3 };
    let worstCategory: FlightCategory = 'VFR';
    let hasThunderstorms = false;
    const hasIcing = false; // Would need PIREP/forecast data
    let hasTurbulence = false;
    const hazardSegments: RouteHazardSegment[] = [];

    for (const point of points) {
      if (categoryRank[point.flightCategory] < categoryRank[worstCategory]) {
        worstCategory = point.flightCategory;
      }
      if (point.windSpeed > 35) hasTurbulence = true;
      if (point.precipitationProb > 80 && point.cloudCover > 80) hasThunderstorms = true;
    }

    // Build hazard segments (consecutive points with same hazard)
    for (let i = 0; i < points.length; i++) {
      for (const hazard of points[i].hazards) {
        // Find the end of this hazard segment
        let j = i;
        while (j + 1 < points.length && points[j + 1].hazards.includes(hazard)) {
          j++;
        }
        if (j > i || points[i].hazards.length > 0) {
          hazardSegments.push({
            fromDistanceNm: Math.round(points[i].distanceNm),
            toDistanceNm: Math.round(points[j].distanceNm),
            hazard,
          });
        }
        // Skip to end of segment
        i = j;
        break; // Only process first hazard per point to avoid duplication
      }
    }

    return {
      departure: { icao: depIcao.toUpperCase(), lat: depLat, lon: depLon },
      arrival: { icao: arrIcao.toUpperCase(), lat: arrLat, lon: arrLon },
      totalDistanceNm: Math.round(totalDistanceNm),
      points,
      summary: {
        worstCategory,
        hasThunderstorms,
        hasIcing,
        hasTurbulence,
        hazardSegments,
      },
    };
  }
}

export const routeWeatherService = new RouteWeatherService();
