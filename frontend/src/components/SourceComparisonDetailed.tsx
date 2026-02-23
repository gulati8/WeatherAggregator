import { useState } from 'react';
import {
  WeatherSource,
  CurrentConditions,
  WeatherSourceId,
  ForecastPeriod,
} from '../types/weather';
import {
  formatTemperature,
  formatWindSpeed,
  formatVisibility,
} from '../utils/formatters';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface SourceComparisonDetailedProps {
  sources: WeatherSource[];
  current: CurrentConditions;
  forecast: ForecastPeriod[];
}

const SOURCE_COLORS: Record<WeatherSourceId, string> = {
  awc: '#2563eb', // Blue - Aviation Weather Center (official)
  openmeteo: '#16a34a', // Green - Open-Meteo
  nws: '#dc2626', // Red - NWS
};

const SOURCE_NAMES: Record<WeatherSourceId, string> = {
  awc: 'Aviation Weather Center',
  openmeteo: 'Open-Meteo',
  nws: 'National Weather Service',
};

type Parameter = 'temperature' | 'windSpeed' | 'visibility';

function SourceComparisonDetailed({
  sources,
  current,
  forecast,
}: SourceComparisonDetailedProps) {
  const [selectedParam, setSelectedParam] = useState<Parameter>('visibility');
  const [showAllSources, setShowAllSources] = useState(true);

  const activeSources = sources.filter((s) => s.status === 'ok');

  // Build chart data showing each source's forecast
  const chartData = forecast.slice(0, 24).map((period) => {
    const time = new Date(period.validFrom);
    const dataPoint: Record<string, number | string | null> = {
      time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      timestamp: time.getTime(),
    };

    // Add each source's value for the selected parameter
    const paramData = period[selectedParam];
    if (paramData && paramData.bySource) {
      Object.entries(paramData.bySource).forEach(([sourceId, value]) => {
        if (value !== null && value !== undefined) {
          dataPoint[sourceId] = typeof value === 'number' ? value : null;
        }
      });
    }

    // Also add the consensus value
    if (paramData) {
      dataPoint.consensus = paramData.value;
    }

    return dataPoint;
  });

  const getParamLabel = (param: Parameter) => {
    switch (param) {
      case 'temperature':
        return 'Temperature (°C)';
      case 'windSpeed':
        return 'Wind Speed (kts)';
      case 'visibility':
        return 'Visibility (SM)';
    }
  };

  const formatValue = (value: number | null | undefined, param: Parameter): string => {
    if (value === null || value === undefined) return '-';
    switch (param) {
      case 'temperature':
        return formatTemperature(value);
      case 'windSpeed':
        return formatWindSpeed(value);
      case 'visibility':
        return formatVisibility(value);
    }
  };

  const getSpreadAnalysis = (param: Parameter) => {
    const data = current[param];
    if (!data.spread || data.spread === 0) {
      return { level: 'good', message: 'Sources agree' };
    }

    const thresholds = {
      temperature: { moderate: 2, significant: 5 },
      windSpeed: { moderate: 5, significant: 10 },
      visibility: { moderate: 2, significant: 5 },
    };

    const t = thresholds[param];
    if (data.spread > t.significant) {
      return {
        level: 'significant',
        message: `Significant disagreement (spread: ${data.spread.toFixed(1)})`,
      };
    }
    if (data.spread > t.moderate) {
      return {
        level: 'moderate',
        message: `Moderate disagreement (spread: ${data.spread.toFixed(1)})`,
      };
    }
    return { level: 'minor', message: `Minor variance (spread: ${data.spread.toFixed(1)})` };
  };

  return (
    <div className="bg-white dark:bg-stone-800 rounded-lg shadow-sm border border-stone-200 dark:border-stone-700 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
          Source-by-Source Comparison
        </h2>
        <div className="flex items-center gap-2">
          <label className="text-sm text-stone-600 dark:text-stone-400">
            <input
              type="checkbox"
              checked={showAllSources}
              onChange={(e) => setShowAllSources(e.target.checked)}
              className="mr-2"
            />
            Show all source lines
          </label>
        </div>
      </div>

      {/* Parameter selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['visibility', 'windSpeed', 'temperature'] as Parameter[]).map((param) => {
          const analysis = getSpreadAnalysis(param);
          return (
            <button
              key={param}
              onClick={() => setSelectedParam(param)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                selectedParam === param
                  ? 'bg-teal-600 text-white'
                  : 'bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
              }`}
            >
              {param === 'temperature' && 'Temperature'}
              {param === 'windSpeed' && 'Wind Speed'}
              {param === 'visibility' && 'Visibility'}
              <span
                className={`w-2 h-2 rounded-full ${
                  analysis.level === 'good'
                    ? 'bg-green-400'
                    : analysis.level === 'minor'
                    ? 'bg-yellow-400'
                    : analysis.level === 'moderate'
                    ? 'bg-orange-400'
                    : 'bg-red-400'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Current values comparison */}
      <div className="mb-6 p-3 sm:p-4 bg-stone-50 dark:bg-stone-700 rounded-lg">
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3">
          Current {getParamLabel(selectedParam)} by Source
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {activeSources.map((source) => {
            const value = current[selectedParam].bySource[source.id];
            return (
              <div
                key={source.id}
                className="p-3 bg-white dark:bg-stone-800 rounded-lg border-l-4"
                style={{ borderColor: SOURCE_COLORS[source.id] }}
              >
                <div className="text-xs text-stone-500 dark:text-stone-400 mb-1">
                  {SOURCE_NAMES[source.id]}
                </div>
                <div className="text-xl font-bold text-stone-900 dark:text-stone-100">
                  {formatValue(value as number, selectedParam)}
                </div>
              </div>
            );
          })}
          <div className="p-3 bg-teal-50 dark:bg-teal-900/30 rounded-lg border-l-4 border-teal-600">
            <div className="text-xs text-teal-600 dark:text-teal-400 mb-1 font-semibold">
              CONSENSUS
            </div>
            <div className="text-xl font-bold text-teal-900 dark:text-teal-100">
              {formatValue(current[selectedParam].value, selectedParam)}
            </div>
          </div>
        </div>

        {/* Spread analysis */}
        {(() => {
          const analysis = getSpreadAnalysis(selectedParam);
          return (
            <div
              className={`mt-3 p-2 rounded text-sm ${
                analysis.level === 'good'
                  ? 'bg-green-100 text-green-800'
                  : analysis.level === 'minor'
                  ? 'bg-yellow-100 text-yellow-800'
                  : analysis.level === 'moderate'
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {analysis.message}
            </div>
          );
        })()}
      </div>

      {/* Multi-source forecast chart */}
      <div>
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3">
          Forecast Comparison: {getParamLabel(selectedParam)}
        </h3>
        <div className="h-48 sm:h-56 md:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string) => [
                  formatValue(value, selectedParam),
                  SOURCE_NAMES[name as WeatherSourceId] || name,
                ]}
              />
              <Legend />

              {/* Render a line for each active source */}
              {showAllSources &&
                activeSources.map((source) => (
                  <Line
                    key={source.id}
                    type="monotone"
                    dataKey={source.id}
                    stroke={SOURCE_COLORS[source.id]}
                    strokeWidth={2}
                    dot={false}
                    name={SOURCE_NAMES[source.id]}
                    connectNulls
                  />
                ))}

              {/* Always show consensus line */}
              <Line
                type="monotone"
                dataKey="consensus"
                stroke="#1f2937"
                strokeWidth={3}
                strokeDasharray={showAllSources ? '5 5' : undefined}
                dot={false}
                name="Consensus"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Source legend with descriptions */}
      <div className="mt-6 pt-4 border-t border-stone-200 dark:border-stone-700">
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3">
          About the Sources
        </h3>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div className="flex gap-2">
            <div
              className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
              style={{ backgroundColor: SOURCE_COLORS.awc }}
            />
            <div>
              <span className="font-medium text-stone-900 dark:text-stone-100">Aviation Weather Center</span>
              <p className="text-stone-500 dark:text-stone-400">
                Official FAA source. METAR (current) and TAF (forecast). Most reliable for aviation decisions.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <div
              className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
              style={{ backgroundColor: SOURCE_COLORS.openmeteo }}
            />
            <div>
              <span className="font-medium text-stone-900 dark:text-stone-100">Open-Meteo</span>
              <p className="text-stone-500 dark:text-stone-400">
                Global weather model data. Provides extended hourly forecasts beyond TAF validity.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <div
              className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
              style={{ backgroundColor: SOURCE_COLORS.nws }}
            />
            <div>
              <span className="font-medium text-stone-900 dark:text-stone-100">National Weather Service</span>
              <p className="text-stone-500 dark:text-stone-400">
                US weather alerts and watches. SIGMETs, AIRMETs, and severe weather warnings.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <div
              className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
              style={{ backgroundColor: '#1f2937' }}
            />
            <div>
              <span className="font-medium text-stone-900 dark:text-stone-100">Consensus (Displayed Value)</span>
              <p className="text-stone-500 dark:text-stone-400">
                Primary value shown in dashboard. Uses AWC when available, falls back to other sources.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SourceComparisonDetailed;
