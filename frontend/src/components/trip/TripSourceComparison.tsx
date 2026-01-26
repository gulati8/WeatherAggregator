import { UnifiedWeatherData, WeatherSourceId } from '../../types/weather';
import { formatCeiling, formatVisibility, formatDateTime } from '../../utils/formatters';
import FlightCategoryBadge from '../FlightCategoryBadge';

interface TripSourceComparisonProps {
  airport: string;
  time: string;
  weather: UnifiedWeatherData;
  label: string; // "Departure" or "Arrival"
}

function TripSourceComparison({
  airport,
  time,
  weather,
  label,
}: TripSourceComparisonProps) {
  const conditions = weather.atTargetTime?.conditions || weather.current;

  // Get source names for display
  const sourceNames: Record<WeatherSourceId, string> = {
    awc: 'AWC',
    avwx: 'AVWX',
    openmeteo: 'Open-Meteo',
    nws: 'NWS',
  };

  // Helper to check if sources disagree on a value
  const hasDisagreement = (
    bySource: Partial<Record<WeatherSourceId, unknown>>
  ): boolean => {
    const values = Object.values(bySource);
    if (values.length < 2) return false;
    return new Set(values.map(String)).size > 1;
  };

  // Check for flight category disagreement
  const categoryDisagreement = hasDisagreement(
    conditions.flightCategory?.bySource || {}
  );

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-xs text-gray-500">{label}</span>
          <h4 className="text-lg font-bold text-gray-900">{airport}</h4>
          <span className="text-xs text-gray-500">{formatDateTime(time)}</span>
        </div>
        <div className="text-right">
          <FlightCategoryBadge
            category={weather.part135Status.flightCategory}
            size="md"
          />
          {categoryDisagreement && (
            <div className="text-xs text-yellow-600 mt-1 flex items-center justify-end gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Sources disagree
            </div>
          )}
        </div>
      </div>

      {/* Multi-source comparison grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Flight Category */}
        <div className="bg-white rounded p-2">
          <div className="text-xs font-medium text-gray-500 mb-2">Category</div>
          <div className="space-y-1">
            {Object.entries(conditions.flightCategory?.bySource || {}).map(
              ([source, value]) => (
                <div key={source} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">
                    {sourceNames[source as WeatherSourceId]}:
                  </span>
                  <FlightCategoryBadge
                    category={value}
                    size="sm"
                  />
                </div>
              )
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-500">Consensus</div>
            <div className="font-semibold">
              {conditions.flightCategory?.value}
            </div>
          </div>
        </div>

        {/* Visibility */}
        <div className="bg-white rounded p-2">
          <div className="text-xs font-medium text-gray-500 mb-2">Visibility</div>
          <div className="space-y-1">
            {Object.entries(conditions.visibility?.bySource || {}).map(
              ([source, value]) => (
                <div key={source} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">
                    {sourceNames[source as WeatherSourceId]}:
                  </span>
                  <span className="font-mono">
                    {formatVisibility(value as number)}
                  </span>
                </div>
              )
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-500">Consensus</div>
            <div className="font-semibold">
              {formatVisibility(conditions.visibility?.value || 0)}
            </div>
            {conditions.visibility?.spread && conditions.visibility.spread > 1 && (
              <div className="text-xs text-yellow-600">
                Spread: {conditions.visibility.spread.toFixed(1)} SM
              </div>
            )}
          </div>
        </div>

        {/* Ceiling */}
        <div className="bg-white rounded p-2">
          <div className="text-xs font-medium text-gray-500 mb-2">Ceiling</div>
          <div className="space-y-1">
            {Object.entries(conditions.ceiling?.bySource || {}).map(
              ([source, value]) => (
                <div key={source} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">
                    {sourceNames[source as WeatherSourceId]}:
                  </span>
                  <span className="font-mono">
                    {formatCeiling(value as number | null)}
                  </span>
                </div>
              )
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-500">Consensus</div>
            <div className="font-semibold">
              {formatCeiling(conditions.ceiling?.value ?? null)}
            </div>
            {conditions.ceiling?.spread && conditions.ceiling.spread > 500 && (
              <div className="text-xs text-yellow-600">
                Spread: {conditions.ceiling.spread} ft
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Source agreement indicator */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Source Agreement:</span>
          <span
            className={`font-medium ${
              weather.consensus.overallAgreement === 'strong'
                ? 'text-green-600'
                : weather.consensus.overallAgreement === 'moderate'
                ? 'text-yellow-600'
                : 'text-red-600'
            }`}
          >
            {weather.consensus.overallAgreement.charAt(0).toUpperCase() +
              weather.consensus.overallAgreement.slice(1)}
          </span>
        </div>
        <div className="text-gray-500">
          Confidence: {weather.consensus.confidenceScore}%
        </div>
      </div>
    </div>
  );
}

export default TripSourceComparison;
