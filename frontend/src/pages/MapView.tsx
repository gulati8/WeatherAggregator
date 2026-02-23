import { useState, useCallback, useRef, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, Polygon, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { weatherApi, mapApi, tfrApi, Tfr } from '../api/client';
import { UnifiedWeatherData, FlightCategory, PirepReport, AirSigmet } from '../types/weather';
import FlightCategoryBadge from '../components/FlightCategoryBadge';
import AirportAutocomplete from '../components/AirportAutocomplete';
import { useFavorites } from '../hooks/useWeather';
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

const FALLBACK_AIRPORTS: string[] = [];

// PIREP intensity color: green → blue → yellow → orange → red → purple
const PIREP_INTENSITY_COLORS: Record<string, string> = {
  NEG: '#22c55e',
  SMTH: '#22c55e',
  LGT: '#3b82f6',
  'LGT-MOD': '#eab308',
  MOD: '#f97316',
  'MOD-SEV': '#ef4444',
  SEV: '#ef4444',
  EXTRM: '#a855f7',
};

function getPirepColor(pirep: PirepReport): string {
  const turbInt = pirep.turbulence?.intensity || '';
  const iceInt = pirep.icing?.intensity || '';
  // Use worst
  const order = ['NEG', 'SMTH', 'LGT', 'LGT-MOD', 'MOD', 'MOD-SEV', 'SEV', 'EXTRM'];
  const tIdx = order.indexOf(turbInt);
  const iIdx = order.indexOf(iceInt);
  const worstKey = tIdx >= iIdx ? turbInt : iceInt;
  return PIREP_INTENSITY_COLORS[worstKey] || '#3b82f6';
}

// AIRSIGMET hazard colors
function getAirSigmetColor(hazard: string): string {
  const h = hazard.toUpperCase();
  if (h.includes('TURB')) return '#f97316'; // orange
  if (h.includes('ICE') || h.includes('ICING')) return '#06b6d4'; // cyan
  if (h.includes('IFR') || h.includes('CONV')) return '#ef4444'; // red
  if (h.includes('MTN')) return '#a855f7'; // purple
  return '#eab308'; // yellow default
}

// TFR type colors
function getTfrColor(type: Tfr['type']): string {
  switch (type) {
    case 'Security': return '#ef4444'; // red
    case 'VIP': return '#ef4444'; // red
    case 'Hazard': return '#f97316'; // orange
    case 'Space Operations': return '#3b82f6'; // blue
    default: return '#eab308'; // yellow
  }
}

interface WeatherLayer {
  id: string;
  label: string;
  group: string;
  url: string;
  attribution: string;
  opacity: number;
  enabled: boolean;
}

const DEFAULT_LAYERS: WeatherLayer[] = [
  { id: 'nexrad', label: 'NEXRAD Radar', group: 'Radar & Precipitation', url: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png', attribution: 'Iowa State Mesonet', opacity: 0.5, enabled: true },
  { id: 'echo-tops', label: 'Echo Tops', group: 'Radar & Precipitation', url: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-eet/{z}/{x}/{y}.png', attribution: 'Iowa State Mesonet', opacity: 0.5, enabled: false },
  { id: 'precip-1h', label: 'Precip (1hr)', group: 'Radar & Precipitation', url: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/q2-n1p/{z}/{x}/{y}.png', attribution: 'Iowa State Mesonet', opacity: 0.5, enabled: false },
  { id: 'precip-global', label: 'Precipitation (Global)', group: 'Weather Overlays', url: '/api/map/owm/precipitation_new/{z}/{x}/{y}.png', attribution: 'OpenWeatherMap', opacity: 0.5, enabled: false },
  { id: 'clouds', label: 'Clouds', group: 'Weather Overlays', url: '/api/map/owm/clouds_new/{z}/{x}/{y}.png', attribution: 'OpenWeatherMap', opacity: 0.5, enabled: false },
  { id: 'temp', label: 'Temperature', group: 'Weather Overlays', url: '/api/map/owm/temp_new/{z}/{x}/{y}.png', attribution: 'OpenWeatherMap', opacity: 0.5, enabled: false },
  { id: 'wind', label: 'Wind', group: 'Weather Overlays', url: '/api/map/owm/wind_new/{z}/{x}/{y}.png', attribution: 'OpenWeatherMap', opacity: 0.5, enabled: false },
  { id: 'pressure', label: 'Pressure', group: 'Weather Overlays', url: '/api/map/owm/pressure_new/{z}/{x}/{y}.png', attribution: 'OpenWeatherMap', opacity: 0.5, enabled: false },
];

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

// Fetches PIREPs when map viewport changes
function MapDataLoader({
  showPireps,
  onPirepsLoaded,
}: {
  showPireps: boolean;
  onPirepsLoaded: (pireps: PirepReport[]) => void;
}) {
  const fetchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useMapEvents({
    moveend: (e) => {
      if (!showPireps) return;
      // Debounce
      if (fetchRef.current) clearTimeout(fetchRef.current);
      fetchRef.current = setTimeout(async () => {
        const bounds = e.target.getBounds();
        const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
        try {
          const pireps = await mapApi.getPireps(bbox);
          onPirepsLoaded(pireps);
        } catch {
          // ignore
        }
      }, 500);
    },
  });

  // Fetch on toggle enable
  const map = useMap();
  useEffect(() => {
    if (!showPireps) return;
    const bounds = map.getBounds();
    const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
    mapApi.getPireps(bbox).then(onPirepsLoaded).catch(() => {});
  }, [showPireps]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function MapView() {
  const navigate = useNavigate();
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorites();
  const [airports, setAirports] = useState<MapAirport[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [layers, setLayers] = useState<WeatherLayer[]>(DEFAULT_LAYERS);
  const [layersPanelOpen, setLayersPanelOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const layersPanelRef = useRef<HTMLDivElement>(null);
  const [showPireps, setShowPireps] = useState(false);
  const [showAirSigmets, setShowAirSigmets] = useState(false);
  const [showTfrs, setShowTfrs] = useState(false);
  const [pireps, setPireps] = useState<PirepReport[]>([]);
  const [airSigmets, setAirSigmets] = useState<AirSigmet[]>([]);
  const [tfrs, setTfrs] = useState<Tfr[]>([]);

  // Close layers panel on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (layersPanelRef.current && !layersPanelRef.current.contains(e.target as Node)) {
        setLayersPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleLayer = (id: string) => {
    setLayers((prev) => prev.map((l) => l.id === id ? { ...l, enabled: !l.enabled } : l));
  };

  const setLayerOpacity = (id: string, opacity: number) => {
    setLayers((prev) => prev.map((l) => l.id === id ? { ...l, opacity } : l));
  };

  // Fetch AIRSIGMETs when toggle enabled
  useEffect(() => {
    if (!showAirSigmets) return;
    mapApi.getAirSigmets().then(setAirSigmets).catch(() => {});
  }, [showAirSigmets]);

  // Fetch TFRs when toggle enabled
  useEffect(() => {
    if (!showTfrs) return;
    tfrApi.getAll().then(setTfrs).catch(() => {});
  }, [showTfrs]);

  const enabledCount = layers.filter((l) => l.enabled).length;
  const isLayerEnabled = (id: string) => layers.some((l) => l.id === id && l.enabled);

  // Fetch weather for an airport
  const fetchAirportWeather = useCallback(async (icao: string): Promise<MapAirport | null> => {
    try {
      const weather = await weatherApi.getWeather(icao);
      return { icao: icao.toUpperCase(), weather };
    } catch {
      return null;
    }
  }, []);

  // Load favorite airports when favorites change
  useEffect(() => {
    const airportsToLoad = favorites.length > 0 ? favorites : FALLBACK_AIRPORTS;
    if (airportsToLoad.length === 0) {
      setInitialLoaded(true);
      return;
    }

    // Only load airports we don't already have
    const existing = new Set(airports.map((a) => a.icao));
    const toFetch = airportsToLoad.filter((icao) => !existing.has(icao));

    if (toFetch.length === 0 && !initialLoaded) {
      setInitialLoaded(true);
      return;
    }
    if (toFetch.length === 0) return;

    setLoading(true);
    setInitialLoaded(true);

    Promise.all(toFetch.map((icao) => fetchAirportWeather(icao))).then((results) => {
      const valid = results.filter((r): r is MapAirport => r !== null);
      setAirports((prev) => [...prev, ...valid]);
      setLoading(false);
    });
  }, [favorites, fetchAirportWeather]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 relative z-[1001]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-2 sm:gap-3">
          <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-auto">
            <AirportAutocomplete
              value={searchValue}
              onChange={(v) => {
                setSearchValue(v);
                setError(null);
              }}
              placeholder="Airport code or city"
              className="flex-1 sm:w-48 sm:flex-none"
              inputClassName="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-3 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Loading...' : 'Add'}
            </button>
          </form>

          {error && (
            <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
          )}

          {/* Airport chips */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto order-3 sm:order-none">
            {airports.map((airport) => {
              const category = getCategory(airport);
              return (
                <div
                  key={airport.icao}
                  className="inline-flex items-center gap-1.5 px-2.5 py-2 bg-gray-100 dark:bg-gray-700 rounded-full text-sm"
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

          {/* Layers button + panel */}
          <div className="relative sm:ml-auto" ref={layersPanelRef}>
            <button
              onClick={() => setLayersPanelOpen(!layersPanelOpen)}
              className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Layers
              {enabledCount > 0 && (
                <span className="bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                  {enabledCount}
                </span>
              )}
            </button>

            {/* Desktop dropdown */}
            {layersPanelOpen && (
              <div className="hidden sm:block absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 py-2 max-h-[70vh] overflow-y-auto">
                {['Radar & Precipitation', 'Weather Overlays'].map((group) => (
                  <div key={group}>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      {group}
                    </div>
                    {layers.filter((l) => l.group === group).map((layer) => (
                      <div key={layer.id} className="px-3 py-1.5">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={layer.enabled}
                            onChange={() => toggleLayer(layer.id)}
                            className="w-3.5 h-3.5 rounded accent-blue-500"
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium flex-1">
                            {layer.label}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            {layer.attribution}
                          </span>
                        </label>
                        {layer.enabled && (
                          <div className="flex items-center gap-2 mt-1 ml-6">
                            <span className="text-[10px] text-gray-400 w-7">{Math.round(layer.opacity * 100)}%</span>
                            <input
                              type="range"
                              min={0.1}
                              max={0.9}
                              step={0.1}
                              value={layer.opacity}
                              onChange={(e) => setLayerOpacity(layer.id, parseFloat(e.target.value))}
                              className="flex-1 h-1 accent-blue-500"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Aviation Data
                  </div>
                  <div className="px-3 py-1.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={showPireps} onChange={() => { setShowPireps(!showPireps); if (showPireps) setPireps([]); }} className="w-3.5 h-3.5 rounded accent-blue-500" />
                      <span className="text-xs text-gray-700 dark:text-gray-300 font-medium flex-1">PIREPs</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">AWC</span>
                    </label>
                  </div>
                  <div className="px-3 py-1.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={showAirSigmets} onChange={() => { setShowAirSigmets(!showAirSigmets); if (showAirSigmets) setAirSigmets([]); }} className="w-3.5 h-3.5 rounded accent-blue-500" />
                      <span className="text-xs text-gray-700 dark:text-gray-300 font-medium flex-1">AIRMETs/SIGMETs</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">AWC</span>
                    </label>
                  </div>
                  <div className="px-3 py-1.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={showTfrs} onChange={() => { setShowTfrs(!showTfrs); if (showTfrs) setTfrs([]); }} className="w-3.5 h-3.5 rounded accent-blue-500" />
                      <span className="text-xs text-gray-700 dark:text-gray-300 font-medium flex-1">TFRs</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">FAA</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile bottom sheet */}
            {layersPanelOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="sm:hidden fixed inset-0 bg-black/30 z-[1100]"
                  onClick={() => setLayersPanelOpen(false)}
                />
                {/* Sheet */}
                <div className="sm:hidden fixed bottom-0 left-0 right-0 z-[1101] max-h-[60vh] bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl animate-slide-up flex flex-col">
                  {/* Drag handle */}
                  <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                  </div>
                  {/* Header */}
                  <div className="sticky top-0 flex items-center justify-between px-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Map Layers</h3>
                    <button
                      onClick={() => setLayersPanelOpen(false)}
                      className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {/* Content */}
                  <div className="overflow-y-auto px-4 py-3">
                    {['Radar & Precipitation', 'Weather Overlays'].map((group) => (
                      <div key={group} className="mb-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                          {group}
                        </div>
                        {layers.filter((l) => l.group === group).map((layer) => (
                          <div key={layer.id} className="py-1">
                            <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                              <input
                                type="checkbox"
                                checked={layer.enabled}
                                onChange={() => toggleLayer(layer.id)}
                                className="w-5 h-5 rounded accent-blue-500"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium flex-1">
                                {layer.label}
                              </span>
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {layer.attribution}
                              </span>
                            </label>
                            {layer.enabled && (
                              <div className="flex items-center gap-2 mt-1 ml-8">
                                <span className="text-xs text-gray-400 w-8">{Math.round(layer.opacity * 100)}%</span>
                                <input
                                  type="range"
                                  min={0.1}
                                  max={0.9}
                                  step={0.1}
                                  value={layer.opacity}
                                  onChange={(e) => setLayerOpacity(layer.id, parseFloat(e.target.value))}
                                  className="flex-1 h-1.5 accent-blue-500"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                    <div className="mb-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                        Aviation Data
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                        <input type="checkbox" checked={showPireps} onChange={() => { setShowPireps(!showPireps); if (showPireps) setPireps([]); }} className="w-5 h-5 rounded accent-blue-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium flex-1">PIREPs</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">AWC</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                        <input type="checkbox" checked={showAirSigmets} onChange={() => { setShowAirSigmets(!showAirSigmets); if (showAirSigmets) setAirSigmets([]); }} className="w-5 h-5 rounded accent-blue-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium flex-1">AIRMETs/SIGMETs</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">AWC</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                        <input type="checkbox" checked={showTfrs} onChange={() => { setShowTfrs(!showTfrs); if (showTfrs) setTfrs([]); }} className="w-5 h-5 rounded accent-blue-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium flex-1">TFRs</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">FAA</span>
                      </label>
                    </div>
                  </div>
                </div>
              </>
            )}
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

          {layers.filter((l) => l.enabled).map((layer) => (
            <TileLayer
              key={layer.id}
              url={layer.url}
              attribution={`&copy; ${layer.attribution}`}
              opacity={layer.opacity}
              zIndex={10}
            />
          ))}

          <MapBounds airports={airports} />
          <MapDataLoader showPireps={showPireps} onPirepsLoaded={setPireps} />

          {/* AIRSIGMET polygons */}
          {showAirSigmets && airSigmets.map((sigmet) => {
            if (!sigmet.coordinates || sigmet.coordinates.length < 3) return null;
            const positions = sigmet.coordinates.map((c) => [c.lat, c.lon] as [number, number]);
            const color = getAirSigmetColor(sigmet.hazard);
            return (
              <Polygon
                key={`sigmet-${sigmet.id}`}
                positions={positions}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.15,
                  weight: 2,
                  opacity: 0.7,
                }}
              >
                <Tooltip>
                  <div className="text-xs">
                    <div className="font-bold">{sigmet.type}: {sigmet.hazard}</div>
                    <div>Severity: {sigmet.severity}</div>
                    {sigmet.altitudeLow != null && sigmet.altitudeHigh != null && (
                      <div>FL{sigmet.altitudeLow} - FL{sigmet.altitudeHigh}</div>
                    )}
                    <div>Valid: {new Date(sigmet.validFrom).toLocaleTimeString()} - {new Date(sigmet.validTo).toLocaleTimeString()}</div>
                  </div>
                </Tooltip>
              </Polygon>
            );
          })}

          {/* TFR polygons */}
          {showTfrs && tfrs.map((tfr) => {
            if (!tfr.coordinates || tfr.coordinates.length < 3) return null;
            const positions = tfr.coordinates.map((c) => [c.lat, c.lon] as [number, number]);
            const color = getTfrColor(tfr.type);
            return (
              <Polygon
                key={`tfr-${tfr.id}`}
                positions={positions}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.2,
                  weight: 2,
                  opacity: 0.8,
                  dashArray: '8 4',
                }}
              >
                <Tooltip>
                  <div className="text-xs max-w-[250px]">
                    <div className="font-bold">{tfr.type} TFR</div>
                    <div>{tfr.notamNumber}</div>
                    {tfr.description && <div className="mt-1">{tfr.description.slice(0, 150)}</div>}
                    {(tfr.altitudeLow != null || tfr.altitudeHigh != null) && (
                      <div className="mt-1">
                        {tfr.altitudeLow != null && <span>From: {tfr.altitudeLow} ft</span>}
                        {tfr.altitudeHigh != null && <span> To: {tfr.altitudeHigh} ft</span>}
                      </div>
                    )}
                  </div>
                </Tooltip>
              </Polygon>
            );
          })}

          {/* PIREP markers */}
          {showPireps && pireps.map((pirep) => {
            const color = getPirepColor(pirep);
            return (
              <CircleMarker
                key={`pirep-${pirep.id}`}
                center={[pirep.location.lat, pirep.location.lon]}
                radius={6}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: 0.8,
                  color,
                  weight: 1,
                  opacity: 1,
                }}
              >
                <Tooltip>
                  <div className="text-xs max-w-[250px]">
                    <div className="font-bold">PIREP - FL{Math.round(pirep.altitude / 100)}</div>
                    <div>{pirep.aircraftType}</div>
                    {pirep.turbulence && <div>Turbulence: {pirep.turbulence.intensity}</div>}
                    {pirep.icing && <div>Icing: {pirep.icing.intensity}</div>}
                    <div className="mt-1 text-gray-500 break-words">{pirep.rawReport}</div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}

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
                  <div className="min-w-[180px] max-w-[calc(100vw-4rem)]">
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
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => navigate(`/weather/${airport.icao}`)}
                        className="flex-1 px-3 py-2.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => isFavorite(airport.icao) ? removeFavorite(airport.icao) : addFavorite(airport.icao)}
                        className={`px-3 py-2.5 text-sm rounded transition-colors ${
                          isFavorite(airport.icao)
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={isFavorite(airport.icao) ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        {isFavorite(airport.icao) ? '\u2605' : '\u2606'}
                      </button>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Legend overlay */}
        {!legendOpen ? (
          <button
            onClick={() => setLegendOpen(true)}
            className="absolute bottom-4 left-4 z-[900] p-2.5 rounded-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border border-gray-200/50 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors"
            title="Show legend"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        ) : (
          <div className="absolute bottom-4 left-4 z-[900] w-64 sm:w-72 max-h-[50vh] bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200/50 dark:border-gray-700/50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200/50 dark:border-gray-700/50 shrink-0">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Legend</span>
              <button
                onClick={() => setLegendOpen(false)}
                className="p-1 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Content */}
            <div className="overflow-y-auto px-3 py-2 space-y-3 text-xs">
              {/* Flight Categories — always shown */}
              <div>
                <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Flight Categories</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {(['VFR', 'MVFR', 'IFR', 'LIFR'] as FlightCategory[]).map((cat) => (
                    <div key={cat} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: FLIGHT_CATEGORY_COLORS[cat] }} />
                      <span className="text-gray-600 dark:text-gray-400">{cat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* NEXRAD Radar */}
              {isLayerEnabled('nexrad') && (
                <div>
                  <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">NEXRAD Radar</div>
                  <div className="h-2.5 rounded-full" style={{ background: 'linear-gradient(to right, #22c55e, #eab308, #f97316, #ef4444, #a855f7)' }} />
                  <div className="flex justify-between mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                    <span>Light</span><span>Moderate</span><span>Heavy</span><span>Extreme</span>
                  </div>
                </div>
              )}

              {/* Echo Tops */}
              {isLayerEnabled('echo-tops') && (
                <div>
                  <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Echo Tops</div>
                  <div className="h-2.5 rounded-full" style={{ background: 'linear-gradient(to right, #9ca3af, #22c55e, #eab308, #ef4444, #d946ef)' }} />
                  <div className="flex justify-between mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                    <span>Low</span><span>20kft</span><span>35kft</span><span>50kft+</span>
                  </div>
                </div>
              )}

              {/* Precipitation */}
              {(isLayerEnabled('precip-1h') || isLayerEnabled('precip-global')) && (
                <div>
                  <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Precipitation</div>
                  <div className="h-2.5 rounded-full" style={{ background: 'linear-gradient(to right, #93c5fd, #3b82f6, #22c55e, #eab308, #ef4444)' }} />
                  <div className="flex justify-between mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                    <span>Trace</span><span>Light</span><span>Moderate</span><span>Heavy</span>
                  </div>
                </div>
              )}

              {/* Clouds */}
              {isLayerEnabled('clouds') && (
                <div>
                  <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Clouds</div>
                  <div className="h-2.5 rounded-full" style={{ background: 'linear-gradient(to right, #bfdbfe, #93c5fd, #60a5fa, #6b7280)' }} />
                  <div className="flex justify-between mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                    <span>Clear</span><span>Overcast</span>
                  </div>
                </div>
              )}

              {/* Temperature */}
              {isLayerEnabled('temp') && (
                <div>
                  <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Temperature</div>
                  <div className="h-2.5 rounded-full" style={{ background: 'linear-gradient(to right, #7c3aed, #3b82f6, #22c55e, #eab308, #ef4444)' }} />
                  <div className="flex justify-between mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                    <span>Cold</span><span>Hot</span>
                  </div>
                </div>
              )}

              {/* Wind */}
              {isLayerEnabled('wind') && (
                <div>
                  <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Wind</div>
                  <div className="h-2.5 rounded-full" style={{ background: 'linear-gradient(to right, #bfdbfe, #3b82f6, #eab308, #ef4444)' }} />
                  <div className="flex justify-between mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                    <span>Calm</span><span>Strong</span>
                  </div>
                </div>
              )}

              {/* Pressure */}
              {isLayerEnabled('pressure') && (
                <div>
                  <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Pressure</div>
                  <div className="h-2.5 rounded-full" style={{ background: 'linear-gradient(to right, #a855f7, #3b82f6, #22c55e, #f97316, #ef4444)' }} />
                  <div className="flex justify-between mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                    <span>Low</span><span>High</span>
                  </div>
                </div>
              )}

              {/* PIREPs */}
              {showPireps && (
                <div>
                  <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">PIREPs</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {[
                      { label: 'Negative/Smooth', color: '#22c55e' },
                      { label: 'Light', color: '#3b82f6' },
                      { label: 'Light-Mod', color: '#eab308' },
                      { label: 'Moderate', color: '#f97316' },
                      { label: 'Mod-Severe', color: '#ef4444' },
                      { label: 'Extreme', color: '#a855f7' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AIRSIGMETs */}
              {showAirSigmets && (
                <div>
                  <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">AIRMETs/SIGMETs</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {[
                      { label: 'Turbulence', color: '#f97316' },
                      { label: 'Icing', color: '#06b6d4' },
                      { label: 'IFR/Convective', color: '#ef4444' },
                      { label: 'Mountain', color: '#a855f7' },
                      { label: 'Other', color: '#eab308' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TFRs */}
              {showTfrs && (
                <div>
                  <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">TFRs</div>
                  <div className="space-y-1">
                    {[
                      { label: 'Security/VIP', color: '#ef4444' },
                      { label: 'Hazard', color: '#f97316' },
                      { label: 'Space Ops', color: '#3b82f6' },
                      { label: 'Other', color: '#eab308' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-1.5">
                        <svg className="w-4 h-1.5 shrink-0" viewBox="0 0 16 6">
                          <line x1="0" y1="3" x2="16" y2="3" stroke={item.color} strokeWidth="2" strokeDasharray="4 2" />
                        </svg>
                        <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
