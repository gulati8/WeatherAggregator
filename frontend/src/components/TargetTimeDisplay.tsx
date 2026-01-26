import { TargetTimeSnapshot } from '../types/weather';
import FlightCategoryBadge from './FlightCategoryBadge';
import {
  formatWindSpeed,
  formatVisibility,
  formatCeiling,
} from '../utils/formatters';

interface TargetTimeDisplayProps {
  snapshot: TargetTimeSnapshot;
  onClear: () => void;
}

function TargetTimeDisplay({ snapshot, onClear }: TargetTimeDisplayProps) {
  const targetDate = new Date(snapshot.targetTime);
  const { conditions } = snapshot;

  const confidenceColors = {
    high: 'bg-green-100 text-green-800 border-green-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-red-100 text-red-800 border-red-300',
  };

  const confidenceLabels = {
    high: 'High confidence',
    medium: 'Medium confidence',
    low: 'Low confidence',
  };

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 mb-6 text-white">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 rounded-lg p-3">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <div className="text-sm text-blue-200 font-medium">
              Forecast for Departure Time
            </div>
            <div className="text-2xl font-bold">
              {targetDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}{' '}
              at{' '}
              {targetDate.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium border ${
                  confidenceColors[snapshot.confidence]
                }`}
              >
                {confidenceLabels[snapshot.confidence]}
              </span>
              {snapshot.forecastHoursAhead > 0 && (
                <span className="text-blue-200 text-sm">
                  +{Math.round(snapshot.forecastHoursAhead)} hours from now
                </span>
              )}
              {snapshot.isCurrentObservation && (
                <span className="text-blue-200 text-sm">
                  Based on current observation
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onClear}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          title="Clear target time"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Conditions summary */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white/10 rounded-lg p-3">
          <div className="text-blue-200 text-xs mb-1">Flight Category</div>
          <FlightCategoryBadge
            category={conditions.flightCategory.value}
            size="sm"
          />
        </div>
        <div className="bg-white/10 rounded-lg p-3">
          <div className="text-blue-200 text-xs mb-1">Visibility</div>
          <div className="font-semibold">
            {formatVisibility(conditions.visibility.value)}
          </div>
        </div>
        <div className="bg-white/10 rounded-lg p-3">
          <div className="text-blue-200 text-xs mb-1">Ceiling</div>
          <div className="font-semibold">
            {formatCeiling(conditions.ceiling.value)}
          </div>
        </div>
        <div className="bg-white/10 rounded-lg p-3">
          <div className="text-blue-200 text-xs mb-1">Wind</div>
          <div className="font-semibold">
            {conditions.windDirection.value !== null
              ? `${String(conditions.windDirection.value).padStart(3, '0')}° `
              : 'VRB '}
            {formatWindSpeed(conditions.windSpeed.value)}
            {conditions.windGust.value && (
              <span className="text-orange-300">
                {' '}
                G{Math.round(conditions.windGust.value)}
              </span>
            )}
          </div>
        </div>
        <div className="bg-white/10 rounded-lg p-3">
          <div className="text-blue-200 text-xs mb-1">Precip Prob</div>
          <div className="font-semibold">
            {conditions.precipitationProbability.value}%
          </div>
        </div>
      </div>

      {/* Weather phenomena */}
      {conditions.weatherPhenomena.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {conditions.weatherPhenomena.map((wx, i) => (
            <span
              key={i}
              className="px-2 py-1 bg-white/20 rounded text-sm"
            >
              {wx.description}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default TargetTimeDisplay;
