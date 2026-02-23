import { useState, useEffect } from 'react';
import { tripApi, RouteWeather } from '../api/client';
import { FlightCategory } from '../types/weather';
import FlightCategoryBadge from './FlightCategoryBadge';

const CATEGORY_COLORS: Record<FlightCategory, string> = {
  VFR: '#22c55e',
  MVFR: '#3b82f6',
  IFR: '#ef4444',
  LIFR: '#a855f7',
};

interface RouteWeatherDisplayProps {
  departureIcao: string;
  arrivalIcao: string;
  departureTime?: string;
}

function RouteWeatherDisplay({ departureIcao, arrivalIcao, departureTime }: RouteWeatherDisplayProps) {
  const [routeWeather, setRouteWeather] = useState<RouteWeather | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!departureIcao || !arrivalIcao) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    tripApi.getRouteWeather(departureIcao, arrivalIcao, departureTime)
      .then((data) => {
        if (!cancelled) setRouteWeather(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.error || 'Failed to fetch route weather');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [departureIcao, arrivalIcao, departureTime]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading en-route weather...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
        <p className="text-sm text-gray-400 dark:text-gray-500">{error}</p>
      </div>
    );
  }

  if (!routeWeather) return null;

  const { points, summary, totalDistanceNm } = routeWeather;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            En-Route Weather
          </h4>
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span>{totalDistanceNm} NM</span>
            <span>{points.length} checkpoints</span>
          </div>
        </div>
      </div>

      {/* Route category bar */}
      <div className="px-4 pt-3">
        <div className="flex h-4 rounded-full overflow-hidden border border-gray-200 dark:border-gray-600">
          {points.map((point, i) => {
            const width = 100 / points.length;
            return (
              <div
                key={i}
                style={{
                  width: `${width}%`,
                  backgroundColor: CATEGORY_COLORS[point.flightCategory],
                }}
                title={`${Math.round(point.distanceNm)} NM: ${point.flightCategory}`}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
          <span>{routeWeather.departure.icao}</span>
          <span>{routeWeather.arrival.icao}</span>
        </div>
      </div>

      {/* Summary badges */}
      <div className="px-4 py-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">Worst:</span>
          <FlightCategoryBadge category={summary.worstCategory} size="sm" />
        </div>
        {summary.hasThunderstorms && (
          <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs rounded-full font-medium">
            Thunderstorms
          </span>
        )}
        {summary.hasTurbulence && (
          <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-xs rounded-full font-medium">
            Turbulence
          </span>
        )}
        {summary.hasIcing && (
          <span className="px-2 py-0.5 bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 text-xs rounded-full font-medium">
            Icing
          </span>
        )}
        {summary.hazardSegments.length > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {summary.hazardSegments.length} hazard segment{summary.hazardSegments.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Hazard segments */}
      {summary.hazardSegments.length > 0 && (
        <div className="px-4 pb-3">
          <div className="space-y-1">
            {summary.hazardSegments.map((seg, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 px-2 py-1 rounded"
              >
                <span className="font-mono">{seg.fromDistanceNm}-{seg.toDistanceNm} NM</span>
                <span>{seg.hazard}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Waypoint table */}
      <div className="px-4 pb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400">
                <th className="text-left py-1.5 pr-3 font-medium">Dist (NM)</th>
                <th className="text-left py-1.5 pr-3 font-medium">Cat</th>
                <th className="text-right py-1.5 pr-3 font-medium">Wind</th>
                <th className="text-right py-1.5 pr-3 font-medium">Vis (SM)</th>
                <th className="text-right py-1.5 pr-3 font-medium">Cloud %</th>
                <th className="text-right py-1.5 pr-3 font-medium">Temp (C)</th>
                <th className="text-left py-1.5 font-medium">Hazards</th>
              </tr>
            </thead>
            <tbody>
              {points.map((pt, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-1.5 pr-3 font-mono">{Math.round(pt.distanceNm)}</td>
                  <td className="py-1.5 pr-3">
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-1"
                      style={{ backgroundColor: CATEGORY_COLORS[pt.flightCategory] }}
                    />
                    {pt.flightCategory}
                  </td>
                  <td className="py-1.5 pr-3 text-right font-mono">
                    {String(pt.windDirection).padStart(3, '0')}/{pt.windSpeed}kt
                  </td>
                  <td className="py-1.5 pr-3 text-right font-mono">{pt.visibility}</td>
                  <td className="py-1.5 pr-3 text-right font-mono">{Math.round(pt.cloudCover)}</td>
                  <td className="py-1.5 pr-3 text-right font-mono">{Math.round(pt.temperature)}</td>
                  <td className="py-1.5 text-gray-600 dark:text-gray-400">
                    {pt.hazards.length > 0 ? pt.hazards.join(', ') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default RouteWeatherDisplay;
