import { Part135Status } from '../types/weather';
import FlightCategoryBadge from './FlightCategoryBadge';
import { formatCeiling, formatVisibility, formatDateTimeDual } from '../utils/formatters';

interface Part135SummaryProps {
  status: Part135Status;
  isForTargetTime?: boolean;
}

function Part135Summary({ status, isForTargetTime }: Part135SummaryProps) {
  const getMinimumStatusStyle = (statusValue: 'above' | 'at' | 'below') => {
    switch (statusValue) {
      case 'above':
        return 'text-green-600';
      case 'at':
        return 'text-yellow-600';
      case 'below':
        return 'text-red-600';
    }
  };

  const getMinimumStatusIcon = (statusValue: 'above' | 'at' | 'below') => {
    switch (statusValue) {
      case 'above':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'at':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'below':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Part 135 Status
          </h2>
          {isForTargetTime && (
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              At departure time
            </span>
          )}
        </div>
        <FlightCategoryBadge category={status.flightCategory} size="md" />
      </div>

      {/* Go/No-Go indicator */}
      <div
        className={`p-4 rounded-lg border-2 mb-6 ${
          status.canDispatch
            ? 'bg-green-50 dark:bg-green-900/30 border-green-500'
            : 'bg-red-50 dark:bg-red-900/30 border-red-500'
        }`}
      >
        <div className="flex items-center gap-3">
          {status.canDispatch ? (
            <svg
              className="w-8 h-8 text-green-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg
              className="w-8 h-8 text-red-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          )}
          <div>
            <div
              className={`text-xl font-bold ${
                status.canDispatch ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
              }`}
            >
              {status.canDispatch ? 'GO' : 'NO-GO'}
            </div>
            <div
              className={`text-sm ${
                status.canDispatch ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {status.canDispatch
                ? 'Weather meets Part 135 minimums'
                : 'Weather below Part 135 minimums'}
            </div>
          </div>
        </div>
      </div>

      {/* Minimums check */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {/* Ceiling */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Ceiling</span>
            <span
              className={`flex items-center gap-1 ${getMinimumStatusStyle(
                status.ceilingStatus.status
              )}`}
            >
              {getMinimumStatusIcon(status.ceilingStatus.status)}
              <span className="capitalize">{status.ceilingStatus.status}</span>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCeiling(status.ceilingStatus.value)}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              / min {status.ceilingStatus.minimum} ft
            </span>
          </div>
          {status.ceilingStatus.value !== null && (
            <div
              className={`text-sm mt-1 ${getMinimumStatusStyle(
                status.ceilingStatus.status
              )}`}
            >
              {status.ceilingStatus.margin > 0
                ? `+${Math.round(status.ceilingStatus.margin)} ft margin`
                : `${Math.round(status.ceilingStatus.margin)} ft below minimum`}
            </div>
          )}
        </div>

        {/* Visibility */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Visibility
            </span>
            <span
              className={`flex items-center gap-1 ${getMinimumStatusStyle(
                status.visibilityStatus.status
              )}`}
            >
              {getMinimumStatusIcon(status.visibilityStatus.status)}
              <span className="capitalize">
                {status.visibilityStatus.status}
              </span>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatVisibility(status.visibilityStatus.value || 0)}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              / min {status.visibilityStatus.minimum} SM
            </span>
          </div>
          <div
            className={`text-sm mt-1 ${getMinimumStatusStyle(
              status.visibilityStatus.status
            )}`}
          >
            {status.visibilityStatus.margin > 0
              ? `+${status.visibilityStatus.margin.toFixed(1)} SM margin`
              : `${status.visibilityStatus.margin.toFixed(1)} SM below minimum`}
          </div>
        </div>
      </div>

      {/* Alternate requirement */}
      {status.alternateRequired && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg mb-4">
          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-300">
            <svg
              className="w-5 h-5 text-yellow-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">Alternate Airport Required</span>
          </div>
          {status.alternateReason && (
            <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1 ml-7">
              {status.alternateReason}
            </p>
          )}
        </div>
      )}

      {/* Alternate analysis details */}
      {status.alternateAnalysis && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg mb-4">
          <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 mb-1">
            <svg
              className="w-4 h-4 text-blue-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-xs font-semibold">Alternate Analysis</span>
          </div>
          <div className="ml-6 space-y-1">
            <p className="text-xs text-blue-700 dark:text-blue-400">
              <span className="font-medium">Regulation:</span>{' '}
              {status.alternateAnalysis.regulation}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-400">
              <span className="font-medium">Method:</span>{' '}
              {status.alternateAnalysis.analysisMethod === 'taf'
                ? 'TAF forecast analysis'
                : status.alternateAnalysis.analysisMethod === 'current'
                ? 'Current conditions (TAF unavailable)'
                : 'Unavailable'}
            </p>
            {status.alternateAnalysis.forecastWindow && (
              <>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  <span className="font-medium">Forecast window:</span>{' '}
                  {formatDateTimeDual(status.alternateAnalysis.forecastWindow.from).utc}
                  {' - '}
                  {formatDateTimeDual(status.alternateAnalysis.forecastWindow.to).utc}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  <span className="font-medium">Worst ceiling:</span>{' '}
                  {formatCeiling(status.alternateAnalysis.forecastWindow.worstCeiling)}
                  {' | '}
                  <span className="font-medium">Worst visibility:</span>{' '}
                  {formatVisibility(status.alternateAnalysis.forecastWindow.worstVisibility)}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Weather hazards */}
      {status.weatherHazards.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Weather Hazards
          </h3>
          <div className="flex flex-wrap gap-2">
            {status.weatherHazards.map((hazard, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 rounded-full text-sm"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {hazard}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Part135Summary;
