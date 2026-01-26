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
    avwx: 'AVWX',
    openmeteo: 'Open-Meteo',
    nws: 'National Weather Service',
  };

  const getStatusColor = (status: WeatherSource['status']) => {
    switch (status) {
      case 'ok':
        return 'bg-green-100 text-green-800';
      case 'stale':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
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
        <span className="ml-1 text-xs text-orange-600" title={`Spread: ${spread.toFixed(1)}`}>
          !
        </span>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
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

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 pr-4 font-medium text-gray-700">
                Parameter
              </th>
              {sources
                .filter((s) => s.status === 'ok')
                .map((source) => (
                  <th
                    key={source.id}
                    className="text-center py-2 px-4 font-medium text-gray-700"
                  >
                    {sourceNames[source.id]}
                  </th>
                ))}
              <th className="text-center py-2 pl-4 font-medium text-gray-900 bg-gray-50">
                Consensus
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Temperature */}
            <tr className="border-b border-gray-100">
              <td className="py-3 pr-4 text-gray-600">Temperature</td>
              {sources
                .filter((s) => s.status === 'ok')
                .map((source) => (
                  <td key={source.id} className="text-center py-3 px-4">
                    {formatValue(source.id, 'temperature')}
                  </td>
                ))}
              <td className="text-center py-3 pl-4 font-semibold bg-gray-50">
                {formatTemperature(current.temperature.value)}
                {getSpreadIndicator(current.temperature.spread, 3)}
              </td>
            </tr>

            {/* Wind Speed */}
            <tr className="border-b border-gray-100">
              <td className="py-3 pr-4 text-gray-600">Wind Speed</td>
              {sources
                .filter((s) => s.status === 'ok')
                .map((source) => (
                  <td key={source.id} className="text-center py-3 px-4">
                    {formatValue(source.id, 'windSpeed')}
                  </td>
                ))}
              <td className="text-center py-3 pl-4 font-semibold bg-gray-50">
                {formatWindSpeed(current.windSpeed.value)}
                {getSpreadIndicator(current.windSpeed.spread, 5)}
              </td>
            </tr>

            {/* Visibility */}
            <tr className="border-b border-gray-100">
              <td className="py-3 pr-4 text-gray-600">Visibility</td>
              {sources
                .filter((s) => s.status === 'ok')
                .map((source) => (
                  <td key={source.id} className="text-center py-3 px-4">
                    {formatValue(source.id, 'visibility')}
                  </td>
                ))}
              <td className="text-center py-3 pl-4 font-semibold bg-gray-50">
                {formatVisibility(current.visibility.value)}
                {getSpreadIndicator(current.visibility.spread, 2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        <span className="text-orange-600">!</span> indicates significant
        disagreement between sources
      </p>
    </div>
  );
}

export default SourceComparison;
