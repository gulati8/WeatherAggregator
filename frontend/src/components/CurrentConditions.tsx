import { CurrentConditions as CurrentConditionsType } from '../types/weather';
import FlightCategoryBadge from './FlightCategoryBadge';
import {
  formatTemperature,
  formatWindSpeed,
  formatWindDirection,
  formatVisibility,
  formatCeiling,
  formatPressure,
  formatRelativeTime,
  formatCloudCoverage,
} from '../utils/formatters';

interface CurrentConditionsProps {
  conditions: CurrentConditionsType;
}

function CurrentConditions({ conditions }: CurrentConditionsProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Current Conditions
        </h2>
        <div className="flex items-center gap-3">
          <FlightCategoryBadge
            category={conditions.flightCategory.value}
            size="lg"
          />
          <span className="text-sm text-gray-500">
            {formatRelativeTime(conditions.observationTime)}
          </span>
        </div>
      </div>

      {/* Main weather grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        {/* Temperature */}
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">
            {formatTemperature(conditions.temperature.value)}
          </div>
          <div className="text-sm text-gray-500">Temperature</div>
          <div className="text-xs text-gray-400 mt-1">
            Dewpoint: {formatTemperature(conditions.dewpoint.value)}
          </div>
        </div>

        {/* Wind */}
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">
            {formatWindSpeed(conditions.windSpeed.value)}
          </div>
          <div className="text-sm text-gray-500">
            {formatWindDirection(conditions.windDirection.value)}
          </div>
          {conditions.windGust.value && (
            <div className="text-xs text-orange-600 mt-1">
              Gusts: {formatWindSpeed(conditions.windGust.value)}
            </div>
          )}
        </div>

        {/* Visibility */}
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">
            {formatVisibility(conditions.visibility.value)}
          </div>
          <div className="text-sm text-gray-500">Visibility</div>
        </div>

        {/* Ceiling */}
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">
            {formatCeiling(conditions.ceiling.value)}
          </div>
          <div className="text-sm text-gray-500">Ceiling</div>
        </div>
      </div>

      {/* Additional info */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        {/* Clouds */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-1">Clouds</div>
          <div className="text-sm text-gray-600">
            {conditions.cloudLayers.length > 0 ? (
              conditions.cloudLayers.map((layer, i) => (
                <div key={i}>
                  {formatCloudCoverage(layer.coverage)}{' '}
                  {layer.base > 0 && `at ${layer.base.toLocaleString()} ft`}
                  {layer.type && ` (${layer.type})`}
                </div>
              ))
            ) : (
              <span>Clear</span>
            )}
          </div>
        </div>

        {/* Weather */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-1">Weather</div>
          <div className="text-sm text-gray-600">
            {conditions.weatherPhenomena.length > 0 ? (
              conditions.weatherPhenomena.map((wx, i) => (
                <div key={i}>{wx.description}</div>
              ))
            ) : (
              <span>No significant weather</span>
            )}
          </div>
        </div>

        {/* Pressure & Humidity */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-1">
            Altimeter
          </div>
          <div className="text-sm text-gray-600">
            {formatPressure(conditions.pressure.value)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Humidity: {Math.round(conditions.humidity.value)}%
          </div>
        </div>
      </div>

      {/* Raw METAR */}
      {conditions.rawMetar && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <details className="group">
            <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
              Raw METAR
              <span className="ml-1 text-gray-400 group-open:hidden">
                (click to expand)
              </span>
            </summary>
            <pre className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono text-gray-700 overflow-x-auto">
              {conditions.rawMetar}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

export default CurrentConditions;
