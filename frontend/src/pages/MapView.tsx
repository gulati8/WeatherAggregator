import { useState, useCallback, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { weatherApi } from '../api/client';
import { UnifiedWeatherData, FlightCategory } from '../types/weather';
import FlightCategoryBadge from '../components/FlightCategoryBadge';
import AirportAutocomplete from '../components/AirportAutocomplete';
import { formatVisibility, formatCeiling, formatWindSpeed } from '../utils/formatters';
import 'leaflet/dist/leaflet.css';

interface MapAirport {
  icao: string;
  weather: UnifiedWeatherData;
}

const FLIGHT_CATEGORY_COLORS: Record<FlightCategory, string> = {
  VFR: '#22c55e',
  MVFR: '#3b82f6',
  IFR: '#ef4444',
  LIFR: '#a855f7',
};

const DEFAULT_AIRPORTS = ['KJFK', 'KLAX', 'KORD', 'KATL', 'KDFW'];

// Component to recenter map when airports change
function MapBounds({ airports }: { airports: MapAirport[] }) {
  const map = useMap();

  // Fit bounds when airports change and there are multiple
  if (airports.length > 1) {
    const bounds = airports
      .filter((a) => a.weather.airport.latitude && a.weather.airport.longitude)
      .map((a) => [a.weather.airport.latitude, a.weather.airport.longitude] as [number, number]);
    if (bounds.length > 1) {
      try {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
      } catch {
        // Ignore bounds errors
      }
    }
  }

  return null;
}

function MapView() {
  const navigate = useNavigate();
  const [airports, setAirports] = useState<MapAirport[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [showRadar, setShowRadar] = useState(true);
  const [radarOpacity, setRadarOpacity] = useState(0.5);

  // Fetch weather for an airport
  const fetchAirportWeather = useCallback(async (icao: string): Promise<MapAirport | null> => {
    try {
      const weather = await weatherApi.getWeather(icao);
      return { icao: icao.toUpperCase(), weather };
    } catch {
      return null;
    }
  }, []);

  // Load default airports on mount
  const loadDefaults = useCallback(async () => {
    if (initialLoaded) return;
    setInitialLoaded(true);
    setLoading(true);

    const results = await Promise.all(
      DEFAULT_AIRPORTS.map((icao) => fetchAirportWeather(icao))
    );

    const validResults = results.filter((r): r is MapAirport => r !== null);
    setAirports(validResults);
    setLoading(false);
  }, [initialLoaded, fetchAirportWeather]);

  // Load defaults when component mounts
  useState(() => {
    loadDefaults();
  });

  // Add airport via search
  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    const icao = searchValue.trim().toUpperCase();

    if (!/^[A-Z]{4}$/.test(icao)) {
      setError('Enter a valid 4-letter ICAO code');
      return;
    }

    // Check if already on map
    if (airports.some((a) => a.icao === icao)) {
      setError(`${icao} is already on the map`);
      return;
    }

    setError(null);
    setLoading(true);

    const result = await fetchAirportWeather(icao);
    if (result) {
      setAirports((prev) => [...prev, result]);
      setSearchValue('');
    } else {
      setError(`Could not fetch weather for ${icao}`);
    }

    setLoading(false);
  };

  // Remove airport from map
  const removeAirport = (icao: string) => {
    setAirports((prev) => prev.filter((a) => a.icao !== icao));
  };

  // Get category for an airport
  const getCategory = (airport: MapAirport): FlightCategory => {
    return airport.weather.current.flightCategory.value;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Search bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <AirportAutocomplete
              value={searchValue}
              onChange={(v) => {
                setSearchValue(v);
                setError(null);
              }}
              placeholder="Airport code or city"
              className="w-48"
              inputClassName="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Loading...' : 'Add'}
            </button>
          </form>

          {error && (
            <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
          )}

          {/* Airport chips */}
          <div className="flex flex-wrap gap-2">
            {airports.map((airport) => {
              const category = getCategory(airport);
              return (
                <div
                  key={airport.icao}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: FLIGHT_CATEGORY_COLORS[category] }}
                  />
                  <span className="font-mono font-medium text-gray-800 dark:text-gray-200">
                    {airport.icao}
                  </span>
                  <button
                    onClick={() => removeAirport(airport.icao)}
                    className="text-gray-400 hover:text-red-500 ml-0.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Radar toggle */}
          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showRadar}
                onChange={(e) => setShowRadar(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-green-500"
              />
              <span className="text-gray-700 dark:text-gray-300 font-medium">NEXRAD Radar</span>
            </label>
            {showRadar && (
              <input
                type="range"
                min={0.1}
                max={0.9}
                step={0.1}
                value={radarOpacity}
                onChange={(e) => setRadarOpacity(parseFloat(e.target.value))}
                className="w-20 h-1.5 accent-green-500"
                title={`Opacity: ${Math.round(radarOpacity * 100)}%`}
              />
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 ml-auto text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: FLIGHT_CATEGORY_COLORS.VFR }} />
              <span>VFR</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: FLIGHT_CATEGORY_COLORS.MVFR }} />
              <span>MVFR</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: FLIGHT_CATEGORY_COLORS.IFR }} />
              <span>IFR</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: FLIGHT_CATEGORY_COLORS.LIFR }} />
              <span>LIFR</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={[39, -98]}
          zoom={5}
          className="h-full w-full"
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {showRadar && (
            <TileLayer
              url="https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://mesonet.agron.iastate.edu/">Iowa State Mesonet</a> NEXRAD'
              opacity={radarOpacity}
              zIndex={10}
            />
          )}

          <MapBounds airports={airports} />

          {airports.map((airport) => {
            const { latitude, longitude } = airport.weather.airport;
            const category = getCategory(airport);
            const color = FLIGHT_CATEGORY_COLORS[category];
            const conditions = airport.weather.current;

            return (
              <CircleMarker
                key={airport.icao}
                center={[latitude, longitude]}
                radius={12}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: 0.8,
                  color: color,
                  weight: 2,
                  opacity: 1,
                }}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-bold">{airport.icao}</span>
                      <FlightCategoryBadge category={category} size="sm" />
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{airport.weather.airport.name}</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Ceiling:</span>
                        <span className="font-medium">{formatCeiling(conditions.ceiling.value)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Visibility:</span>
                        <span className="font-medium">{formatVisibility(conditions.visibility.value)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Wind:</span>
                        <span className="font-medium">{formatWindSpeed(conditions.windSpeed.value)}</span>
                      </div>
                      {airport.weather.part135Status && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Part 135:</span>
                          <span className={`font-semibold ${
                            airport.weather.part135Status.canDispatch
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {airport.weather.part135Status.canDispatch ? 'GO' : 'NO-GO'}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => navigate(`/weather/${airport.icao}`)}
                      className="mt-3 w-full px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Full Weather Details
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Loading overlay */}
        {loading && airports.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 z-[1000]">
            <div className="flex items-center gap-3 bg-white dark:bg-gray-800 px-6 py-4 rounded-lg shadow-lg">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-700 dark:text-gray-300">Loading airports...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MapView;
