import { TripSummary, TripLegIssue } from '../../types/trip';
import FlightCategoryBadge from '../FlightCategoryBadge';

interface TripSummaryPanelProps {
  summary: TripSummary;
  onShiftTimes: (minutes: number) => void;
  loading?: boolean;
}

function TripSummaryPanel({ summary, onShiftTimes, loading }: TripSummaryPanelProps) {
  const getStatusStyle = () => {
    switch (summary.overallStatus) {
      case 'GO':
        return 'bg-green-50 border-green-500 text-green-700';
      case 'NO-GO':
        return 'bg-red-50 border-red-500 text-red-700';
      case 'CAUTION':
        return 'bg-yellow-50 border-yellow-500 text-yellow-700';
    }
  };

  const getStatusIcon = () => {
    switch (summary.overallStatus) {
      case 'GO':
        return (
          <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'NO-GO':
        return (
          <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'CAUTION':
        return (
          <svg className="w-8 h-8 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  const getConfidenceStyle = () => {
    switch (summary.overallConfidence) {
      case 'high':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-red-600';
    }
  };

  const getAgreementStyle = () => {
    switch (summary.multiSourceAgreement) {
      case 'strong':
        return 'text-green-600';
      case 'moderate':
        return 'text-yellow-600';
      case 'weak':
        return 'text-red-600';
    }
  };

  const getSeverityStyle = (severity: TripLegIssue['severity']) => {
    switch (severity) {
      case 'warning':
        return 'bg-red-100 text-red-800';
      case 'caution':
        return 'bg-yellow-100 text-yellow-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* Main status indicator */}
      <div className={`p-4 rounded-lg border-2 mb-4 ${getStatusStyle()}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {loading ? (
              <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            ) : (
              getStatusIcon()
            )}
            <div className="flex-1">
              <div className="text-2xl font-bold">
                {loading ? 'Loading...' : summary.overallStatus}
              </div>
              <div className="text-sm">
                {summary.goLegs}/{summary.totalLegs} legs clear
                {summary.cautionLegs > 0 && ` | ${summary.cautionLegs} caution`}
                {summary.noGoLegs > 0 && ` | ${summary.noGoLegs} no-go`}
              </div>
            </div>
          </div>
          <div className="text-left sm:text-right mt-2 sm:mt-0">
            <div className={`text-sm font-medium ${getConfidenceStyle()}`}>
              {summary.overallConfidence.charAt(0).toUpperCase() +
                summary.overallConfidence.slice(1)}{' '}
              confidence
            </div>
            <div className={`text-xs ${getAgreementStyle()}`}>
              {summary.multiSourceAgreement.charAt(0).toUpperCase() +
                summary.multiSourceAgreement.slice(1)}{' '}
              source agreement
            </div>
          </div>
        </div>
      </div>

      {/* Worst conditions */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
        <div>
          <span className="text-sm text-gray-600">Worst conditions:</span>
          <span className="ml-2 text-sm text-gray-900">
            Leg {summary.worstLegIndex + 1}
          </span>
        </div>
        <FlightCategoryBadge category={summary.worstFlightCategory} size="sm" />
      </div>

      {/* Time shift controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
        <span className="text-sm text-gray-600">Shift all times:</span>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => onShiftTimes(-120)}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            -2h
          </button>
          <button
            onClick={() => onShiftTimes(-60)}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            -1h
          </button>
          <button
            onClick={() => onShiftTimes(60)}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            +1h
          </button>
          <button
            onClick={() => onShiftTimes(120)}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            +2h
          </button>
        </div>
      </div>

      {/* Critical issues */}
      {summary.criticalIssues.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Critical Issues ({summary.criticalIssues.length})
          </h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {summary.criticalIssues.map((issue, index) => (
              <div
                key={index}
                className={`text-xs px-2 py-1 rounded ${getSeverityStyle(issue.severity)}`}
              >
                {issue.description}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TripSummaryPanel;
