import { useState } from 'react';
import { PirepReport } from '../types/weather';
import DualTime from './DualTime';

interface PirepDisplayProps {
  pireps: PirepReport[];
}

const TURBULENCE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  NEG: { bg: 'bg-green-100', text: 'text-green-800', label: 'None' },
  SMTH: { bg: 'bg-green-100', text: 'text-green-800', label: 'Smooth' },
  LGT: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Light' },
  'LGT-MOD': { bg: 'bg-sky-100', text: 'text-sky-800', label: 'Light-Moderate' },
  MOD: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Moderate' },
  'MOD-SEV': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Moderate-Severe' },
  SEV: { bg: 'bg-red-100', text: 'text-red-800', label: 'Severe' },
  EXTRM: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Extreme' },
};

const ICING_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  NEG: { bg: 'bg-green-100', text: 'text-green-800', label: 'None' },
  NEGClr: { bg: 'bg-green-100', text: 'text-green-800', label: 'None (Clear)' },
  TRC: { bg: 'bg-cyan-100', text: 'text-cyan-800', label: 'Trace' },
  LGT: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Light' },
  'LGT-MOD': { bg: 'bg-sky-100', text: 'text-sky-800', label: 'Light-Moderate' },
  MOD: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Moderate' },
  'MOD-SEV': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Moderate-Severe' },
  SEV: { bg: 'bg-red-100', text: 'text-red-800', label: 'Severe' },
  EXTRM: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Extreme' },
};

function getIntensityStyle(intensity: string, colorMap: Record<string, { bg: string; text: string; label: string }>) {
  return colorMap[intensity] || { bg: 'bg-gray-100', text: 'text-gray-800', label: intensity };
}

function formatAltitude(alt: number | null): string {
  if (alt === null) return '--';
  return `${alt.toLocaleString()} ft`;
}

function PirepDisplay({ pireps }: PirepDisplayProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (pireps.length === 0) {
    return null;
  }

  // Sort by report time, most recent first
  const sortedPireps = [...pireps].sort(
    (a, b) => new Date(b.reportTime).getTime() - new Date(a.reportTime).getTime()
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
        Pilot Reports ({pireps.length})
      </h2>

      <div className="space-y-2">
        {sortedPireps.map((pirep) => {
          const isExpanded = expandedId === pirep.id;
          const turbStyle = pirep.turbulence
            ? getIntensityStyle(pirep.turbulence.intensity, TURBULENCE_COLORS)
            : null;
          const iceStyle = pirep.icing
            ? getIntensityStyle(pirep.icing.intensity, ICING_COLORS)
            : null;

          return (
            <div
              key={pirep.id}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : pirep.id)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium text-gray-700">
                      FL{Math.round(pirep.altitude / 100).toString().padStart(3, '0')}
                    </span>
                    <span className="text-xs text-gray-500">
                      {pirep.aircraftType}
                    </span>
                    {turbStyle && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${turbStyle.bg} ${turbStyle.text}`}>
                        Turb: {turbStyle.label}
                      </span>
                    )}
                    {iceStyle && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${iceStyle.bg} ${iceStyle.text}`}>
                        Ice: {iceStyle.label}
                      </span>
                    )}
                    {pirep.weatherString && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        Wx: {pirep.weatherString}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <DualTime time={pirep.reportTime} size="sm" />
                    <svg
                      className={`w-4 h-4 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Altitude:</span>{' '}
                      <span className="font-medium">{pirep.altitude.toLocaleString()} ft</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Aircraft:</span>{' '}
                      <span className="font-medium">{pirep.aircraftType}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Location:</span>{' '}
                      <span className="font-medium">
                        {pirep.location.lat.toFixed(2)}, {pirep.location.lon.toFixed(2)}
                      </span>
                    </div>
                    {pirep.turbulence && (
                      <div>
                        <span className="text-gray-500">Turbulence:</span>{' '}
                        <span className="font-medium">
                          {turbStyle?.label}
                          {(pirep.turbulence.minAlt !== null || pirep.turbulence.maxAlt !== null) && (
                            <> ({formatAltitude(pirep.turbulence.minAlt)} - {formatAltitude(pirep.turbulence.maxAlt)})</>
                          )}
                        </span>
                      </div>
                    )}
                    {pirep.icing && (
                      <div>
                        <span className="text-gray-500">Icing:</span>{' '}
                        <span className="font-medium">
                          {iceStyle?.label}
                          {(pirep.icing.minAlt !== null || pirep.icing.maxAlt !== null) && (
                            <> ({formatAltitude(pirep.icing.minAlt)} - {formatAltitude(pirep.icing.maxAlt)})</>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 p-2 bg-gray-100 rounded font-mono text-xs text-gray-700 break-all">
                    {pirep.rawReport}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PirepDisplay;
