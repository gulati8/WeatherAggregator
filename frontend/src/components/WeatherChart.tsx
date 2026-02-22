import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { ForecastPeriod, WeatherSourceId } from '../types/weather';

interface WeatherChartProps {
  forecast: ForecastPeriod[];
  highlightTime?: string;
}

const SOURCE_COLORS: Record<WeatherSourceId | 'consensus', string> = {
  awc: '#2563eb',      // Blue
  openmeteo: '#16a34a', // Green
  nws: '#dc2626',      // Red
  consensus: '#6b7280', // Gray
};

const SOURCE_NAMES: Record<WeatherSourceId | 'consensus', string> = {
  awc: 'AWC (Official)',
  openmeteo: 'Open-Meteo',
  nws: 'NWS',
  consensus: 'Consensus',
};

type ChartParam = 'windSpeed' | 'visibility' | 'precipProb';

function WeatherChart({ forecast, highlightTime }: WeatherChartProps) {
  const [selectedParam, setSelectedParam] = useState<ChartParam>('visibility');
  const [showSources, setShowSources] = useState(true);

  const now = new Date();
  const next24h = new Date(now.getTime() + 24 * 3600000);
  const highlightDate = highlightTime ? new Date(highlightTime) : null;

  // Find the time label for the highlight reference line
  const highlightTimeLabel = highlightDate
    ? highlightDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  // Build chart data with separate lines for each source
  const chartData = forecast
    .filter((period) => {
      const periodStart = new Date(period.validFrom);
      return periodStart >= now && periodStart <= next24h;
    })
    .map((period) => {
      const date = new Date(period.validFrom);
      const dataPoint: Record<string, number | string | null> = {
        time: date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        timestamp: date.getTime(),
      };

      // Add data based on selected parameter
      if (selectedParam === 'windSpeed') {
        // Add each source's wind speed
        Object.entries(period.windSpeed.bySource).forEach(([source, value]) => {
          if (value !== null && value !== undefined) {
            dataPoint[source] = value;
          }
        });
        dataPoint.consensus = period.windSpeed.value;

        // Add gust data
        if (period.windGust.value) {
          dataPoint.gust = period.windGust.value;
        }
      } else if (selectedParam === 'visibility') {
        Object.entries(period.visibility.bySource).forEach(([source, value]) => {
          if (value !== null && value !== undefined) {
            dataPoint[source] = value;
          }
        });
        dataPoint.consensus = period.visibility.value;
      } else if (selectedParam === 'precipProb') {
        Object.entries(period.precipitationProbability.bySource).forEach(
          ([source, value]) => {
            if (value !== null && value !== undefined) {
              dataPoint[source] = value;
            }
          }
        );
        dataPoint.consensus = period.precipitationProbability.value;
      }

      return dataPoint;
    });

  // Determine which sources have data
  const sourcesWithData = new Set<string>();
  chartData.forEach((point) => {
    Object.keys(point).forEach((key) => {
      if (
        key !== 'time' &&
        key !== 'timestamp' &&
        key !== 'consensus' &&
        key !== 'gust' &&
        point[key] !== null
      ) {
        sourcesWithData.add(key);
      }
    });
  });

  const getParamConfig = (param: ChartParam) => {
    switch (param) {
      case 'windSpeed':
        return {
          label: 'Wind Speed (knots)',
          unit: 'kts',
          referenceLines: [{ y: 25, label: '25kt', color: '#ef4444' }],
          domain: [0, 'auto'] as [number, 'auto'],
        };
      case 'visibility':
        return {
          label: 'Visibility (SM)',
          unit: 'SM',
          referenceLines: [
            { y: 3, label: 'MVFR', color: '#3b82f6' },
            { y: 1, label: 'IFR', color: '#ef4444' },
          ],
          domain: [0, 'auto'] as [number, 'auto'],
        };
      case 'precipProb':
        return {
          label: 'Precipitation Probability (%)',
          unit: '%',
          referenceLines: [],
          domain: [0, 100] as [number, number],
        };
    }
  };

  const config = getParamConfig(selectedParam);

  if (chartData.length < 2) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Weather Trends
        </h2>
        <div className="text-center py-8 text-gray-500">
          Not enough forecast data to display trends.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          24-Hour Weather Trends
        </h2>

        <div className="flex flex-wrap items-center gap-4">
          {/* Show sources toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showSources}
              onChange={(e) => setShowSources(e.target.checked)}
              className="rounded"
            />
            Show individual sources
          </label>

          {/* Parameter selector */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(
              [
                { key: 'visibility', label: 'Visibility' },
                { key: 'windSpeed', label: 'Wind' },
                { key: 'precipProb', label: 'Precip %' },
              ] as { key: ChartParam; label: string }[]
            ).map((param) => (
              <button
                key={param.key}
                onClick={() => setSelectedParam(param.key)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  selectedParam === param.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {param.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              domain={config.domain}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
              formatter={(value: number, name: string) => {
                const displayName =
                  SOURCE_NAMES[name as WeatherSourceId] || name;
                return [`${value.toFixed(1)} ${config.unit}`, displayName];
              }}
            />
            <Legend />

            {/* Reference lines */}
            {config.referenceLines.map((ref, i) => (
              <ReferenceLine
                key={i}
                y={ref.y}
                stroke={ref.color}
                strokeDasharray="5 5"
                label={{
                  value: ref.label,
                  position: 'right',
                  fontSize: 10,
                  fill: ref.color,
                }}
              />
            ))}

            {/* Target time reference line */}
            {highlightTimeLabel && (
              <ReferenceLine
                x={highlightTimeLabel}
                stroke="#2563eb"
                strokeWidth={2}
                strokeDasharray="4 4"
                label={{
                  value: 'Departure',
                  position: 'top',
                  fontSize: 11,
                  fill: '#2563eb',
                  fontWeight: 'bold',
                }}
              />
            )}

            {/* Source lines */}
            {showSources &&
              Array.from(sourcesWithData).map((source) => (
                <Line
                  key={source}
                  type="monotone"
                  dataKey={source}
                  stroke={SOURCE_COLORS[source as WeatherSourceId] || '#9ca3af'}
                  strokeWidth={2}
                  dot={false}
                  name={SOURCE_NAMES[source as WeatherSourceId] || source}
                  connectNulls
                />
              ))}

            {/* Consensus line (always shown) */}
            <Line
              type="monotone"
              dataKey="consensus"
              stroke={showSources ? '#1f2937' : '#3b82f6'}
              strokeWidth={showSources ? 3 : 2}
              strokeDasharray={showSources ? '5 5' : undefined}
              dot={false}
              name="Consensus"
              connectNulls
            />

            {/* Gust line for wind */}
            {selectedParam === 'windSpeed' && (
              <Line
                type="monotone"
                dataKey="gust"
                stroke="#f97316"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                name="Gusts"
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend explanation */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
          {showSources && (
            <>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-0.5"
                  style={{ backgroundColor: SOURCE_COLORS.awc }}
                />
                <span>AWC (TAF - Official aviation forecast)</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-0.5"
                  style={{ backgroundColor: SOURCE_COLORS.openmeteo }}
                />
                <span>Open-Meteo (Weather model)</span>
              </div>
            </>
          )}
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-gray-800" style={{ borderStyle: 'dashed' }} />
            <span>Consensus (Displayed value - AWC preferred)</span>
          </div>
          {selectedParam === 'visibility' && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-blue-500" />
                <span>MVFR threshold (3 SM)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-red-500" />
                <span>IFR threshold (1 SM)</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default WeatherChart;
