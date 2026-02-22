import { TripLegWeather, TripLegIssue } from '../../types/trip';
import { UnifiedWeatherData } from '../../types/weather';
import { formatCeiling, formatVisibility } from '../../utils/formatters';
import FlightCategoryBadge from '../FlightCategoryBadge';
import TripSourceComparison from './TripSourceComparison';
import DualTime from '../DualTime';

function RawReports({ icao, weather }: { icao: string; weather: UnifiedWeatherData }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {icao} Raw Reports
      </h5>

      {/* Current METAR */}
      {weather.current.rawMetar ? (
        <div className="mb-2">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">METAR (current)</span>
          <pre className="mt-0.5 text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-all bg-white dark:bg-gray-800 rounded px-2 py-1.5 border border-gray-200 dark:border-gray-700">
            {weather.current.rawMetar}
          </pre>
        </div>
      ) : (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">No METAR available</p>
      )}

      {/* Previous METARs */}
      {weather.recentMetars && weather.recentMetars.length > 0 && (
        <div className="mb-2">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            Previous METARs ({weather.recentMetars.length})
          </span>
          <div className="mt-0.5 space-y-1">
            {weather.recentMetars.map((metar, idx) => (
              <pre
                key={idx}
                className="text-xs font-mono text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-all bg-white dark:bg-gray-800 rounded px-2 py-1.5 border border-gray-100 dark:border-gray-700"
              >
                {metar}
              </pre>
            ))}
          </div>
        </div>
      )}

      {/* TAF */}
      {weather.rawTaf ? (
        <div>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">TAF</span>
          <pre className="mt-0.5 text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-all bg-white dark:bg-gray-800 rounded px-2 py-1.5 border border-gray-200 dark:border-gray-700">
            {weather.rawTaf}
          </pre>
        </div>
      ) : (
        <p className="text-xs text-gray-400 dark:text-gray-500">No TAF available</p>
      )}
    </div>
  );
}

interface TripLegCardProps {
  leg: TripLegWeather;
  index: number;
}

function TripLegCard({ leg, index }: TripLegCardProps) {
  const getSeverityStyle = (severity: TripLegIssue['severity']) => {
    switch (severity) {
      case 'warning':
        return 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700';
      case 'caution':
        return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700';
      case 'info':
        return 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700';
    }
  };

  const getStatusBadge = () => {
    if (!leg.legStatus.canDispatch) {
      return (
        <span className="px-3 py-1 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 rounded-full text-sm font-semibold">
          NO-GO
        </span>
      );
    }
    const hasWarnings = leg.legStatus.issues.some((i) => i.severity === 'warning');
    const hasCautions = leg.legStatus.issues.some((i) => i.severity === 'caution');

    if (hasWarnings) {
      return (
        <span className="px-3 py-1 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 rounded-full text-sm font-semibold">
          CAUTION
        </span>
      );
    }
    if (hasCautions) {
      return (
        <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 rounded-full text-sm font-semibold">
          CAUTION
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full text-sm font-semibold">
        GO
      </span>
    );
  };

  // Calculate flight duration display
  const hours = Math.floor(leg.estimatedFlightMinutes / 60);
  const mins = leg.estimatedFlightMinutes % 60;
  const durationStr = `${hours}h ${mins}m`;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Leg {index + 1}</span>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {leg.departureAirport.icao} → {leg.arrivalAirport.icao}
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <DualTime time={leg.departureTime} size="sm" />
              <span>({durationStr})</span>
            </span>
          </div>
          {getStatusBadge()}
        </div>
      </div>

      {/* Main content */}
      <div className="p-4">
        {/* Two-column layout for departure and arrival */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {/* Departure */}
          <TripSourceComparison
            airport={leg.departureAirport.icao}
            time={leg.departureTime}
            weather={leg.departureAirport.weather}
            label="Departure"
          />

          {/* Arrival */}
          <TripSourceComparison
            airport={leg.arrivalAirport.icao}
            time={leg.arrivalTime}
            weather={leg.arrivalAirport.weather}
            label="Arrival"
          />
        </div>

        {/* Part 135 Summary Row */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {/* Departure Part 135 */}
          <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {leg.departureAirport.icao} Part 135 Status
            </h5>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <div
                className={`px-3 py-1 rounded-lg ${
                  leg.legStatus.departureStatus.canDispatch
                    ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }`}
              >
                <span className="font-semibold">
                  {leg.legStatus.departureStatus.canDispatch ? 'GO' : 'NO-GO'}
                </span>
              </div>
              <FlightCategoryBadge
                category={leg.legStatus.departureStatus.flightCategory}
                size="sm"
              />
              <div className="text-xs text-gray-600 dark:text-gray-400">
                <div>Ceiling: {formatCeiling(leg.legStatus.departureStatus.ceilingStatus.value)}</div>
                <div>Visibility: {formatVisibility(leg.legStatus.departureStatus.visibilityStatus.value || 0)}</div>
              </div>
            </div>
          </div>

          {/* Arrival Part 135 */}
          <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {leg.arrivalAirport.icao} Part 135 Status
            </h5>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <div
                className={`px-3 py-1 rounded-lg ${
                  leg.legStatus.arrivalStatus.canDispatch
                    ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }`}
              >
                <span className="font-semibold">
                  {leg.legStatus.arrivalStatus.canDispatch ? 'GO' : 'NO-GO'}
                </span>
              </div>
              <FlightCategoryBadge
                category={leg.legStatus.arrivalStatus.flightCategory}
                size="sm"
              />
              <div className="text-xs text-gray-600 dark:text-gray-400">
                <div>Ceiling: {formatCeiling(leg.legStatus.arrivalStatus.ceilingStatus.value)}</div>
                <div>Visibility: {formatVisibility(leg.legStatus.arrivalStatus.visibilityStatus.value || 0)}</div>
              </div>
            </div>
            {leg.legStatus.arrivalStatus.alternateRequired && (
              <div className="mt-2 text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 px-2 py-1 rounded">
                Alternate required: {leg.legStatus.arrivalStatus.alternateReason}
              </div>
            )}
          </div>
        </div>

        {/* Raw METAR & TAF */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {/* Departure Raw */}
          <RawReports
            icao={leg.departureAirport.icao}
            weather={leg.departureAirport.weather}
          />

          {/* Arrival Raw */}
          <RawReports
            icao={leg.arrivalAirport.icao}
            weather={leg.arrivalAirport.weather}
          />
        </div>

        {/* Issues list */}
        {leg.legStatus.issues.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Issues ({leg.legStatus.issues.length})
            </h5>
            <div className="space-y-1">
              {leg.legStatus.issues.map((issue, idx) => (
                <div
                  key={idx}
                  className={`text-sm px-3 py-2 rounded border ${getSeverityStyle(
                    issue.severity
                  )}`}
                >
                  <div className="flex items-center gap-2">
                    {issue.severity === 'warning' && (
                      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    {issue.severity === 'caution' && (
                      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    {issue.severity === 'info' && (
                      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    <span>{issue.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TripLegCard;
