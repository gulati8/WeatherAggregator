import { useState } from 'react';
import { ForecastPeriod, WeatherSourceId } from '../types/weather';
import FlightCategoryBadge from './FlightCategoryBadge';
import {
  formatWindSpeed,
  formatVisibility,
  formatCeiling,
  formatTime,
} from '../utils/formatters';

interface ForecastTimelineProps {
  forecast: ForecastPeriod[];
}

const SOURCE_COLORS: Record<WeatherSourceId, { bg: string; text: string; border: string }> = {
  awc: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
  avwx: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300' },
  openmeteo: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300' },
  nws: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
};

const SOURCE_NAMES: Record<WeatherSourceId, string> = {
  awc: 'AWC',
  avwx: 'AVWX',
  openmeteo: 'Open-Meteo',
  nws: 'NWS',
};

function getMainSource(period: ForecastPeriod): WeatherSourceId {
  // Determine the primary source for this forecast period
  // Check visibility first as it's usually the most complete
  const visibilitySources = Object.keys(period.visibility.bySource) as WeatherSourceId[];
  if (visibilitySources.includes('awc')) return 'awc';
  if (visibilitySources.length > 0) return visibilitySources[0];

  // Fall back to wind
  const windSources = Object.keys(period.windSpeed.bySource) as WeatherSourceId[];
  if (windSources.includes('awc')) return 'awc';
  if (windSources.length > 0) return windSources[0];

  return 'openmeteo';
}

function ForecastTimeline({ forecast }: ForecastTimelineProps) {
  const [selectedHours, setSelectedHours] = useState(24);
  const [filterSource, setFilterSource] = useState<WeatherSourceId | 'all'>('all');

  const timeOptions = [
    { label: '6h', hours: 6 },
    { label: '12h', hours: 12 },
    { label: '24h', hours: 24 },
    { label: '48h', hours: 48 },
  ];

  const now = new Date();
  const cutoffTime = new Date(now.getTime() + selectedHours * 3600000);

  const filteredForecast = forecast.filter((period) => {
    const periodStart = new Date(period.validFrom);
    const inTimeRange = periodStart >= now && periodStart <= cutoffTime;

    if (!inTimeRange) return false;
    if (filterSource === 'all') return true;

    // Check if this period has data from the selected source
    const mainSource = getMainSource(period);
    return mainSource === filterSource;
  });

  // Get unique sources in the forecast
  const sourcesInForecast = Array.from(
    new Set(forecast.map(getMainSource))
  );

  const getPeriodTypeLabel = (type: ForecastPeriod['type']) => {
    switch (type) {
      case 'FM':
        return 'From';
      case 'TEMPO':
        return 'Temporary';
      case 'BECMG':
        return 'Becoming';
      case 'PROB':
        return 'Probability';
      default:
        return '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Forecast Timeline
        </h2>

        <div className="flex flex-wrap items-center gap-4">
          {/* Source filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Source:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setFilterSource('all')}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  filterSource === 'all'
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {sourcesInForecast.map((source) => (
                <button
                  key={source}
                  onClick={() => setFilterSource(source)}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    filterSource === source
                      ? `${SOURCE_COLORS[source].bg} ${SOURCE_COLORS[source].text} ring-1 ring-current`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {SOURCE_NAMES[source]}
                </button>
              ))}
            </div>
          </div>

          {/* Time range */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {timeOptions.map((option) => (
              <button
                key={option.hours}
                onClick={() => setSelectedHours(option.hours)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  selectedHours === option.hours
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Source legend */}
      <div className="flex flex-wrap gap-4 mb-4 p-3 bg-gray-50 rounded-lg text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span><strong>AWC</strong> = Aviation Weather Center (TAF - official)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span><strong>Open-Meteo</strong> = Weather model (extended forecast)</span>
        </div>
      </div>

      {filteredForecast.length > 0 ? (
        <div className="space-y-2">
          {filteredForecast.map((period, index) => {
            const mainSource = getMainSource(period);
            const sourceStyle = SOURCE_COLORS[mainSource];

            return (
              <div
                key={index}
                className={`flex items-start gap-4 p-4 rounded-lg border-l-4 transition-colors ${sourceStyle.bg} ${sourceStyle.border}`}
              >
                {/* Source badge */}
                <div className="flex-shrink-0 w-20">
                  <span
                    className={`inline-block px-2 py-0.5 text-xs font-bold rounded ${sourceStyle.text} bg-white/50`}
                  >
                    {SOURCE_NAMES[mainSource]}
                  </span>
                </div>

                {/* Time column */}
                <div className="flex-shrink-0 w-24">
                  <div className="text-sm font-semibold text-gray-900">
                    {formatTime(period.validFrom)}
                  </div>
                  <div className="text-xs text-gray-500">
                    to {formatTime(period.validTo)}
                  </div>
                  {period.type !== 'BASE' && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-white/70 text-gray-700 rounded">
                      {getPeriodTypeLabel(period.type)}
                      {period.probability && ` ${period.probability}%`}
                    </span>
                  )}
                </div>

                {/* Flight category */}
                <div className="flex-shrink-0">
                  <FlightCategoryBadge
                    category={period.flightCategory.value}
                    size="sm"
                  />
                </div>

                {/* Weather details */}
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Wind</span>
                    <div className="font-medium text-gray-900">
                      {period.windDirection.value !== null
                        ? `${String(period.windDirection.value).padStart(3, '0')}°`
                        : 'VRB'}{' '}
                      {formatWindSpeed(period.windSpeed.value)}
                      {period.windGust.value && (
                        <span className="text-orange-600">
                          {' '}G{Math.round(period.windGust.value)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Visibility</span>
                    <div className="font-medium text-gray-900">
                      {formatVisibility(period.visibility.value)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Ceiling</span>
                    <div className="font-medium text-gray-900">
                      {formatCeiling(period.ceiling.value)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Precip %</span>
                    <div className="font-medium text-gray-900">
                      {period.precipitationProbability.value}%
                    </div>
                  </div>
                </div>

                {/* Weather phenomena */}
                {period.weatherPhenomena.length > 0 && (
                  <div className="flex-shrink-0 flex flex-wrap gap-1">
                    {period.weatherPhenomena.map((wx, i) => (
                      <span
                        key={i}
                        className="inline-block px-2 py-1 text-xs bg-white/70 text-gray-700 rounded"
                      >
                        {wx.description}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No forecast data available for the selected time period and source.
        </div>
      )}
    </div>
  );
}

export default ForecastTimeline;
