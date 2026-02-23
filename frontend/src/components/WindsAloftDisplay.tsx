import { useState, useEffect } from 'react';
import api from '../api/client';

interface WindsAloftLevel {
  altitude: number;
  windDirection: number | null;
  windSpeed: number;
  temperature: number | null;
  lightAndVariable: boolean;
}

interface WindsAloftStation {
  stationId: string;
  levels: WindsAloftLevel[];
}

interface WindsAloftForecast {
  basedOn: string;
  validTime: string;
  forecastHour: string;
  stations: WindsAloftStation[];
}

function WindArrow({ direction }: { direction: number }) {
  return (
    <span
      className="inline-block w-4 h-4 text-teal-500"
      style={{ transform: `rotate(${direction + 180}deg)` }}
      title={`${direction}°`}
    >
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l-5 10h3v10h4V12h3z" />
      </svg>
    </span>
  );
}

export default function WindsAloftDisplay({ icao }: { icao: string }) {
  const [forecast, setForecast] = useState<WindsAloftForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fcstHour, setFcstHour] = useState('06');

  useEffect(() => {
    if (!icao) return;
    setLoading(true);
    setError(null);

    api
      .get<WindsAloftForecast>(`/weather/${icao}/winds-aloft`, {
        params: { fcst: fcstHour },
      })
      .then((res) => {
        setForecast(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Unable to load winds aloft data');
        setLoading(false);
      });
  }, [icao, fcstHour]);

  const station = forecast?.stations?.[0];

  return (
    <div className="bg-white dark:bg-stone-800 rounded-lg shadow-sm border border-stone-200 dark:border-stone-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
          Winds Aloft
        </h2>
        <div className="flex gap-1">
          {['06', '12', '24'].map((h) => (
            <button
              key={h}
              onClick={() => setFcstHour(h)}
              className={`px-3 py-2 min-h-[44px] text-xs font-medium rounded-lg transition-colors ${
                fcstHour === h
                  ? 'bg-teal-600 text-white'
                  : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
              }`}
            >
              {h}hr
            </button>
          ))}
        </div>
      </div>

      {station && (
        <div className="text-xs text-stone-500 dark:text-stone-400 mb-3">
          Station: {station.stationId} | Valid: {new Date(forecast!.validTime).toLocaleString()}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      )}

      {error && (
        <div className="text-sm text-stone-500 dark:text-stone-400">{error}</div>
      )}

      {station && station.levels.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-700">
                <th className="text-left py-2 px-2 text-stone-500 dark:text-stone-400 font-medium text-xs">
                  Altitude (ft)
                </th>
                <th className="text-center py-2 px-2 text-stone-500 dark:text-stone-400 font-medium text-xs">
                  Direction
                </th>
                <th className="text-center py-2 px-2 text-stone-500 dark:text-stone-400 font-medium text-xs">
                  Speed (kts)
                </th>
                <th className="text-center py-2 px-2 text-stone-500 dark:text-stone-400 font-medium text-xs">
                  Temp (C)
                </th>
              </tr>
            </thead>
            <tbody>
              {station.levels.map((level) => (
                <tr
                  key={level.altitude}
                  className="border-b border-stone-100 dark:border-stone-700/50"
                >
                  <td className="py-1.5 px-2 font-data text-stone-900 dark:text-stone-100">
                    {level.altitude.toLocaleString()}
                  </td>
                  <td className="py-1.5 px-2 text-center text-stone-700 dark:text-stone-300">
                    {level.lightAndVariable ? (
                      <span className="text-stone-400 text-xs">L&V</span>
                    ) : level.windDirection != null ? (
                      <span className="flex items-center justify-center gap-1">
                        <WindArrow direction={level.windDirection} />
                        <span className="font-data">{level.windDirection}°</span>
                      </span>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-center font-data text-stone-700 dark:text-stone-300">
                    {level.lightAndVariable ? (
                      <span className="text-stone-400 text-xs">calm</span>
                    ) : (
                      <span className={level.windSpeed >= 50 ? 'text-orange-600 font-semibold' : ''}>
                        {level.windSpeed}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-center font-data text-stone-700 dark:text-stone-300">
                    {level.temperature != null ? (
                      <span className={level.temperature <= 0 ? 'text-teal-500' : 'text-red-500'}>
                        {level.temperature > 0 ? '+' : ''}{level.temperature}
                      </span>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && !station && (
        <div className="text-sm text-stone-500 dark:text-stone-400">
          No winds aloft data available for this station.
        </div>
      )}
    </div>
  );
}
