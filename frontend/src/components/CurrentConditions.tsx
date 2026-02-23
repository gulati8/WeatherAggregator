import { CurrentConditions as CurrentConditionsType } from '../types/weather';
import FlightCategoryBadge from './FlightCategoryBadge';
import DataValue from './ui/DataValue';
import ExpandableSection from './ui/ExpandableSection';
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
  targetTimeLabel?: string;
}

function CurrentConditions({ conditions, targetTimeLabel }: CurrentConditionsProps) {
  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <h2 className="text-lg font-semibold font-display text-stone-900 dark:text-stone-100">
          {targetTimeLabel ? 'Conditions at Target Time' : 'Current Conditions'}
        </h2>
        <div className="flex items-center gap-3">
          <FlightCategoryBadge
            category={conditions.flightCategory.value}
            size="lg"
            showFriendly
          />
          <span className="text-sm text-stone-500 dark:text-stone-400">
            {targetTimeLabel || formatRelativeTime(conditions.observationTime)}
          </span>
        </div>
      </div>

      {/* Main weather grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        <DataValue
          label="Temperature"
          value={formatTemperature(conditions.temperature.value)}
          sub={`Dewpoint: ${formatTemperature(conditions.dewpoint.value)}`}
        />
        <DataValue
          label={formatWindDirection(conditions.windDirection.value)}
          value={formatWindSpeed(conditions.windSpeed.value)}
          sub={
            conditions.windGust.value
              ? `Gusts: ${formatWindSpeed(conditions.windGust.value)}`
              : undefined
          }
        />
        <DataValue
          label="Visibility"
          value={formatVisibility(conditions.visibility.value)}
        />
        <DataValue
          label="Ceiling"
          value={formatCeiling(conditions.ceiling.value)}
        />
      </div>

      {/* Additional info */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-stone-200 dark:border-stone-700">
        {/* Clouds */}
        <div>
          <div className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Clouds</div>
          <div className="text-sm text-stone-600 dark:text-stone-400">
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
          <div className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Weather</div>
          <div className="text-sm text-stone-600 dark:text-stone-400">
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
          <div className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
            Altimeter
          </div>
          <div className="text-sm text-stone-600 dark:text-stone-400">
            {formatPressure(conditions.pressure.value)}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Humidity: {Math.round(conditions.humidity.value)}%
          </div>
        </div>
      </div>

      {/* Raw METAR */}
      {conditions.rawMetar && (
        <div className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-700">
          <ExpandableSection title="Raw METAR">
            <pre className="mt-2 p-3 bg-stone-50 dark:bg-stone-700 rounded-card text-xs font-data text-stone-700 dark:text-stone-300 overflow-x-auto">
              {conditions.rawMetar}
            </pre>
          </ExpandableSection>
        </div>
      )}
    </div>
  );
}

export default CurrentConditions;
