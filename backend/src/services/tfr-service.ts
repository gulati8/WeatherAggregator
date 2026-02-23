import axios from 'axios';
import { cacheService } from './cache';

export interface Tfr {
  id: string;
  notamNumber: string;
  type: 'Security' | 'Hazard' | 'VIP' | 'Space Operations' | 'Special';
  description: string;
  effectiveStart: string;
  effectiveEnd: string;
  altitudeLow: number | null; // feet MSL
  altitudeHigh: number | null;
  center: { lat: number; lon: number } | null;
  radius: number | null; // nautical miles
  coordinates: Array<{ lat: number; lon: number }>;
  isActive: boolean;
}

function classifyTfr(description: string): Tfr['type'] {
  const upper = description.toUpperCase();
  if (upper.includes('SECURITY') || upper.includes('NATIONAL DEFENSE')) return 'Security';
  if (upper.includes('VIP') || upper.includes('TEMPORARY FLIGHT RESTRICTIONS FOR') && upper.includes('PRESIDENT')) return 'VIP';
  if (upper.includes('SPACE') || upper.includes('ROCKET') || upper.includes('LAUNCH')) return 'Space Operations';
  if (upper.includes('HAZARD') || upper.includes('FIRE') || upper.includes('DISASTER') || upper.includes('EMERGENCY')) return 'Hazard';
  return 'Special';
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Earth radius in nautical miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

class TfrService {
  private readonly geojsonUrl = 'https://tfr.faa.gov/tfr_map_498/tfrGeojson.geojson';

  async getAllTfrs(): Promise<Tfr[]> {
    const cacheKey = 'tfrs:all';
    const cached = await cacheService.get<Tfr[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(this.geojsonUrl, {
        timeout: 15000,
        headers: { Accept: 'application/json' },
      });

      const data = response.data;
      const tfrs: Tfr[] = [];
      const now = new Date();

      if (data && data.features && Array.isArray(data.features)) {
        for (const feature of data.features) {
          const props = feature.properties || {};
          const geometry = feature.geometry || {};

          const coordinates: Array<{ lat: number; lon: number }> = [];

          // Extract coordinates from GeoJSON geometry
          if (geometry.type === 'Polygon' && geometry.coordinates) {
            const ring = geometry.coordinates[0]; // outer ring
            if (ring) {
              for (const coord of ring) {
                coordinates.push({ lat: coord[1], lon: coord[0] });
              }
            }
          } else if (geometry.type === 'Point' && geometry.coordinates) {
            coordinates.push({
              lat: geometry.coordinates[1],
              lon: geometry.coordinates[0],
            });
          }

          const description = props.description || props.txt || props.name || '';
          const notamNumber = props.notamNumber || props.notam || props.id || `TFR-${tfrs.length}`;

          const effectiveStart = props.effectiveStart || props.dateEffective || now.toISOString();
          const effectiveEnd = props.effectiveEnd || props.dateExpire || '';

          const isActive = effectiveEnd ? new Date(effectiveEnd) > now : true;

          // Parse altitudes
          const altLow = props.altLow != null ? Number(props.altLow) : null;
          const altHigh = props.altHigh != null ? Number(props.altHigh) : null;

          // Calculate center from coordinates
          let center: { lat: number; lon: number } | null = null;
          if (coordinates.length > 0) {
            const avgLat = coordinates.reduce((s, c) => s + c.lat, 0) / coordinates.length;
            const avgLon = coordinates.reduce((s, c) => s + c.lon, 0) / coordinates.length;
            center = { lat: avgLat, lon: avgLon };
          }

          tfrs.push({
            id: String(notamNumber),
            notamNumber: String(notamNumber),
            type: classifyTfr(description),
            description,
            effectiveStart,
            effectiveEnd,
            altitudeLow: altLow,
            altitudeHigh: altHigh,
            center,
            radius: props.radius ? Number(props.radius) : null,
            coordinates,
            isActive,
          });
        }
      }

      await cacheService.set(cacheKey, tfrs, 300); // 5 min cache
      return tfrs;
    } catch (error) {
      console.error('TFR fetch error:', error);
      return [];
    }
  }

  async getNearbyTfrs(lat: number, lon: number, radiusNm: number = 100): Promise<Tfr[]> {
    const allTfrs = await this.getAllTfrs();

    return allTfrs.filter((tfr) => {
      if (tfr.center) {
        return haversineDistance(lat, lon, tfr.center.lat, tfr.center.lon) <= radiusNm;
      }
      // Check if any vertex is within range
      return tfr.coordinates.some(
        (c) => haversineDistance(lat, lon, c.lat, c.lon) <= radiusNm
      );
    });
  }
}

export const tfrService = new TfrService();
