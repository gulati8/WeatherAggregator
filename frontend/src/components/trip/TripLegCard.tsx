import { TripLegWeather, TripLegIssue } from '../../types/trip';
import { formatDateTime, formatCeiling, formatVisibility } from '../../utils/formatters';
import FlightCategoryBadge from '../FlightCategoryBadge';
import TripSourceComparison from './TripSourceComparison';

interface TripLegCardProps {
  leg: TripLegWeather;
  index: number;
}

function TripLegCard({ leg, index }: TripLegCardProps) {
  const getSeverityStyle = (severity: TripLegIssue['severity']) => {
    switch (severity) {
      case 'warning':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'caution':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getStatusBadge = () => {
    if (!leg.legStatus.canDispatch) {
      return (
        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
          NO-GO
        </span>
      );
    }
    const hasWarnings = leg.legStatus.issues.some((i) => i.severity === 'warning');
    const hasCautions = leg.legStatus.issues.some((i) => i.severity === 'caution');

    if (hasWarnings) {
      return (
        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
          CAUTION
        </span>
      );
    }
    if (hasCautions) {
      return (
        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
          CAUTION
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
        GO
      </span>
    );
  };

  // Calculate flight duration display
  const hours = Math.floor(leg.estimatedFlightMinutes / 60);
  const mins = leg.estimatedFlightMinutes % 60;
  const durationStr = `${hours}h ${mins}m`;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <span className="text-sm font-medium text-gray-500">Leg {index + 1}</span>
            <div className="text-lg font-bold text-gray-900">
              {leg.departureAirport.icao} → {leg.arrivalAirport.icao}
            </div>
            <span className="text-sm text-gray-500">
              {formatDateTime(leg.departureTime)} ({durationStr})
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
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <h5 className="text-sm font-medium text-gray-700 mb-2">
              {leg.departureAirport.icao} Part 135 Status
            </h5>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <div
                className={`px-3 py-1 rounded-lg ${
                  leg.legStatus.departureStatus.canDispatch
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
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
              <div className="text-xs text-gray-600">
                <div>Ceiling: {formatCeiling(leg.legStatus.departureStatus.ceilingStatus.value)}</div>
                <div>Visibility: {formatVisibility(leg.legStatus.departureStatus.visibilityStatus.value || 0)}</div>
              </div>
            </div>
          </div>

          {/* Arrival Part 135 */}
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <h5 className="text-sm font-medium text-gray-700 mb-2">
              {leg.arrivalAirport.icao} Part 135 Status
            </h5>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <div
                className={`px-3 py-1 rounded-lg ${
                  leg.legStatus.arrivalStatus.canDispatch
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
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
              <div className="text-xs text-gray-600">
                <div>Ceiling: {formatCeiling(leg.legStatus.arrivalStatus.ceilingStatus.value)}</div>
                <div>Visibility: {formatVisibility(leg.legStatus.arrivalStatus.visibilityStatus.value || 0)}</div>
              </div>
            </div>
            {leg.legStatus.arrivalStatus.alternateRequired && (
              <div className="mt-2 text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
                Alternate required: {leg.legStatus.arrivalStatus.alternateReason}
              </div>
            )}
          </div>
        </div>

        {/* Issues list */}
        {leg.legStatus.issues.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">
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
