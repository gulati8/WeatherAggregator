import { WeatherSource, CurrentConditions, WeatherSourceId } from '../types/weather';
import {
  formatTemperature,
  formatWindSpeed,
  formatVisibility,
  formatRelativeTime,
} from '../utils/formatters';

interface SourceComparisonProps {
  sources: WeatherSource[];
  current: CurrentConditions;
}

function SourceComparison({ sources, current }: SourceComparisonProps) {
  const sourceNames: Record<WeatherSourceId, string> = {
    awc: 'Aviation Weather Center',
    openmeteo: 'Open-Meteo',
    nws: 'National Weather Service',
  };

  const getStatusColor = (status: WeatherSource['status']) => {
    switch (status) {
      case 'ok':
        return 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300';
      case 'stale':
        return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300';
      case 'error':
        return 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300';
    }
  };

  const formatValue = (
    sourceId: WeatherSourceId,
    param: 'temperature' | 'windSpeed' | 'visibility'
  ): string => {
    const sourceValue = current[param].bySource[sourceId];

    if (sourceValue === undefined || sourceValue === null) {
      return '-';
    }

    switch (param) {
      case 'temperature':
        return formatTemperature(sourceValue as number);
      case 'windSpeed':
        return formatWindSpeed(sourceValue as number);
      case 'visibility':
        return formatVisibility(sourceValue as number);
    }
  };

  const getSpreadIndicator = (spread: number | undefined, threshold: number) => {
    if (spread === undefined) return null;
    if (spread > threshold) {
      return (
        <span className="ml-1 text-xs text-orange-600 dark:text-orange-400" title={`Spread: ${spread.toFixed(1)}`}>
          !
        </span>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-stone-800 rounded-lg shadow-sm border border-stone-200 dark:border-stone-700 p-6">
      <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">
        Source Comparison
      </h2>

      {/* Source status badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {sources.map((source) => (
          <div
            key={source.id}
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${getStatusColor(
              source.status
            )}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                source.status === 'ok'
                  ? 'bg-green-500'
                  : source.status === 'stale'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
            />
            <span className="font-medium">{source.name}</span>
            {source.lastUpdated && (
              <span className="text-xs opacity-75">
                {formatRelativeTime(source.lastUpdated)}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {(['temperature', 'windSpeed', 'visibility'] as const).map((param) => {
          const labels = { temperature: 'Temperature', windSpeed: 'Wind Speed', visibility: 'Visibility' };
          const formatFns = { temperature: formatTemperature, windSpeed: formatWindSpeed, visibility: formatVisibility };
          return (
            <div key={param} className="bg-stone-50 dark:bg-stone-700 rounded-lg p-3">
              <div className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">{labels[param]}</div>
              <div className="space-y-1">
                {sources.filter((s) => s.status === 'ok').map((source) => (
                  <div key={source.id} className="flex justify-between text-sm">
                    <span className="text-stone-500 dark:text-stone-400">{sourceNames[source.id]}</span>
                    <span className="text-stone-900 dark:text-stone-100">{formatValue(source.id, param)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-semibold border-t border-stone-200 dark:border-stone-700 pt-1 mt-1">
                  <span className="text-stone-700 dark:text-stone-200">Consensus</span>
                  <span className="text-stone-900 dark:text-stone-100">
                    {formatFns[param](current[param].value)}
                    {getSpreadIndicator(current[param].spread, param === 'temperature' ? 3 : param === 'windSpeed' ? 5 : 2)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison table (desktop) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 dark:border-stone-700">
              <th className="text-left py-2 pr-4 font-medium text-stone-700 dark:text-stone-300">
                Parameter
              </th>
              {sources
                .filter((s) => s.status === 'ok')
                .map((source) => (
                  <th
                    key={source.id}
                    className="text-center py-2 px-4 font-medium text-stone-700 dark:text-stone-300"
                  >
                    {sourceNames[source.id]}
                  </th>
                ))}
              <th className="text-center py-2 pl-4 font-medium text-stone-900 dark:text-stone-100 bg-stone-50 dark:bg-stone-700">
                Consensus
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Temperature */}
            <tr className="border-b border-stone-100 dark:border-stone-700">
              <td className="py-3 pr-4 text-stone-600 dark:text-stone-400">Temperature</td>
              {sources
                .filter((s) => s.status === 'ok')
                .map((source) => (
                  <td key={source.id} className="text-center py-3 px-4 text-stone-900 dark:text-stone-100">
                    {formatValue(source.id, 'temperature')}
                  </td>
                ))}
              <td className="text-center py-3 pl-4 font-semibold bg-stone-50 dark:bg-stone-700 text-stone-900 dark:text-stone-100">
                {formatTemperature(current.temperature.value)}
                {getSpreadIndicator(current.temperature.spread, 3)}
              </td>
            </tr>

            {/* Wind Speed */}
            <tr className="border-b border-stone-100 dark:border-stone-700">
              <td className="py-3 pr-4 text-stone-600 dark:text-stone-400">Wind Speed</td>
              {sources
                .filter((s) => s.status === 'ok')
                .map((source) => (
                  <td key={source.id} className="text-center py-3 px-4 text-stone-900 dark:text-stone-100">
                    {formatValue(source.id, 'windSpeed')}
                  </td>
                ))}
              <td className="text-center py-3 pl-4 font-semibold bg-stone-50 dark:bg-stone-700 text-stone-900 dark:text-stone-100">
                {formatWindSpeed(current.windSpeed.value)}
                {getSpreadIndicator(current.windSpeed.spread, 5)}
              </td>
            </tr>

            {/* Visibility */}
            <tr className="border-b border-stone-100 dark:border-stone-700">
              <td className="py-3 pr-4 text-stone-600 dark:text-stone-400">Visibility</td>
              {sources
                .filter((s) => s.status === 'ok')
                .map((source) => (
                  <td key={source.id} className="text-center py-3 px-4 text-stone-900 dark:text-stone-100">
                    {formatValue(source.id, 'visibility')}
                  </td>
                ))}
              <td className="text-center py-3 pl-4 font-semibold bg-stone-50 dark:bg-stone-700 text-stone-900 dark:text-stone-100">
                {formatVisibility(current.visibility.value)}
                {getSpreadIndicator(current.visibility.spread, 2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-stone-500 dark:text-stone-400 hidden md:block">
        <span className="text-orange-600 dark:text-orange-400">!</span> indicates significant
        disagreement between sources
      </p>
    </div>
  );
}

export default SourceComparison;
