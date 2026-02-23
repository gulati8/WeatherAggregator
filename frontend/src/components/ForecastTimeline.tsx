import { useState } from 'react';
import { ForecastPeriod, WeatherSourceId } from '../types/weather';
import FlightCategoryBadge from './FlightCategoryBadge';
import {
  formatWindSpeed,
  formatVisibility,
  formatCeiling,
} from '../utils/formatters';
import DualTime from './DualTime';

interface ForecastTimelineProps {
  forecast: ForecastPeriod[];
  highlightTime?: string;
}

const SOURCE_COLORS: Record<WeatherSourceId, { bg: string; text: string; border: string }> = {
  awc: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-600' },
  openmeteo: { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-300 dark:border-green-600' },
  nws: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-300 dark:border-red-600' },
};

const SOURCE_NAMES: Record<WeatherSourceId, string> = {
  awc: 'AWC',
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

function ForecastTimeline({ forecast, highlightTime }: ForecastTimelineProps) {
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
  const highlightDate = highlightTime ? new Date(highlightTime) : null;

  const filteredForecast = forecast.filter((period) => {
    const periodStart = new Date(period.validFrom);
    const inTimeRange = periodStart >= now && periodStart <= cutoffTime;

    if (!inTimeRange) return false;
    if (filterSource === 'all') return true;

    // Check if this period has data from the selected source
    const mainSource = getMainSource(period);
    return mainSource === filterSource;
  });

  const isHighlightedPeriod = (period: ForecastPeriod): boolean => {
    if (!highlightDate) return false;
    const from = new Date(period.validFrom);
    const to = new Date(period.validTo);
    return highlightDate >= from && highlightDate < to;
  };

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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Forecast Timeline
        </h2>

        <div className="flex flex-wrap items-center gap-4">
          {/* Source filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Source:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setFilterSource('all')}
                className={`px-3 py-2 text-xs font-medium rounded transition-colors ${
                  filterSource === 'all'
                    ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                All
              </button>
              {sourcesInForecast.map((source) => (
                <button
                  key={source}
                  onClick={() => setFilterSource(source)}
                  className={`px-3 py-2 text-xs font-medium rounded transition-colors ${
                    filterSource === source
                      ? `${SOURCE_COLORS[source].bg} ${SOURCE_COLORS[source].text} ring-1 ring-current`
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {SOURCE_NAMES[source]}
                </button>
              ))}
            </div>
          </div>

          {/* Time range */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {timeOptions.map((option) => (
              <button
                key={option.hours}
                onClick={() => setSelectedHours(option.hours)}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedHours === option.hours
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Source legend */}
      <div className="flex flex-wrap gap-4 mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span className="text-gray-700 dark:text-gray-300"><strong>AWC</strong> = Aviation Weather Center (TAF - official)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-gray-700 dark:text-gray-300"><strong>Open-Meteo</strong> = Weather model (extended forecast)</span>
        </div>
      </div>

      {filteredForecast.length > 0 ? (
        <div className="space-y-2">
          {filteredForecast.map((period, index) => {
            const mainSource = getMainSource(period);
            const sourceStyle = SOURCE_COLORS[mainSource];
            const isHighlighted = isHighlightedPeriod(period);

            const highlightClasses = isHighlighted
              ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-500 ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800'
              : `${sourceStyle.bg} ${sourceStyle.border}`;

            const windText = (
              <>
                {period.windDirection.value !== null
                  ? `${String(period.windDirection.value).padStart(3, '0')}°`
                  : 'VRB'}{' '}
                {formatWindSpeed(period.windSpeed.value)}
                {period.windGust.value && (
                  <span className="text-orange-600 dark:text-orange-400">
                    {' '}G{Math.round(period.windGust.value)}
                  </span>
                )}
              </>
            );

            return (
              <div key={index}>
                {/* Mobile card layout */}
                <div
                  className={`relative sm:hidden p-4 rounded-lg border-l-4 transition-colors ${highlightClasses}`}
                >
                  {isHighlighted && (
                    <div className="absolute -top-3 left-4">
                      <div className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded font-bold shadow">
                        DEPARTURE TIME
                      </div>
                    </div>
                  )}
                  {/* Top row: badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-bold rounded ${sourceStyle.text} bg-white/50 dark:bg-gray-800/50`}
                    >
                      {SOURCE_NAMES[mainSource]}
                    </span>
                    <FlightCategoryBadge
                      category={period.flightCategory.value}
                      size="sm"
                    />
                    {period.type !== 'BASE' && (
                      <span className="inline-block px-2 py-0.5 text-xs bg-white/70 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 rounded">
                        {getPeriodTypeLabel(period.type)}
                        {period.probability && ` ${period.probability}%`}
                      </span>
                    )}
                  </div>
                  {/* Time range */}
                  <div className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                    <DualTime time={period.validFrom} showDate={false} size="sm" /> to{' '}
                    <DualTime time={period.validTo} showDate={false} size="sm" />
                  </div>
                  {/* 2x2 weather grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Wind</span>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {windText}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Visibility</span>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {formatVisibility(period.visibility.value)}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Ceiling</span>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {formatCeiling(period.ceiling.value)}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Precip %</span>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {period.precipitationProbability.value}%
                      </div>
                    </div>
                  </div>
                  {/* Weather phenomena */}
                  {period.weatherPhenomena.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {period.weatherPhenomena.map((wx, i) => (
                        <span
                          key={i}
                          className="inline-block px-2 py-1 text-xs bg-white/70 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 rounded"
                        >
                          {wx.description}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Desktop row layout */}
                <div
                  className={`relative hidden sm:flex items-start gap-4 p-4 rounded-lg border-l-4 transition-colors ${highlightClasses}`}
                >
                  {isHighlighted && (
                    <div className="absolute -top-3 left-4">
                      <div className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded font-bold shadow">
                        DEPARTURE TIME
                      </div>
                    </div>
                  )}
                  {/* Source badge */}
                  <div className="flex-shrink-0 w-20">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-bold rounded ${sourceStyle.text} bg-white/50 dark:bg-gray-800/50`}
                    >
                      {SOURCE_NAMES[mainSource]}
                    </span>
                  </div>
                  {/* Time column */}
                  <div className="flex-shrink-0 w-32">
                    <DualTime time={period.validFrom} showDate={false} size="sm" layout="stacked" />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      to <DualTime time={period.validTo} showDate={false} size="sm" />
                    </div>
                    {period.type !== 'BASE' && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-white/70 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 rounded">
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
                  <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Wind</span>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {windText}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Visibility</span>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {formatVisibility(period.visibility.value)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Ceiling</span>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {formatCeiling(period.ceiling.value)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Precip %</span>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
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
                          className="inline-block px-2 py-1 text-xs bg-white/70 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 rounded"
                        >
                          {wx.description}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No forecast data available for the selected time period and source.
        </div>
      )}
    </div>
  );
}

export default ForecastTimeline;
