import { useState } from 'react';
import { AirSigmet } from '../types/weather';
import DualTime from './DualTime';

interface AirSigmetDisplayProps {
  airSigmets: AirSigmet[];
}

const HAZARD_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  TURB: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-400' },
  ICE: { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-400' },
  IFR: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-400' },
  'MTN OBSCN': { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-400' },
  CONVECTIVE: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-400' },
  ASH: { bg: 'bg-stone-100', text: 'text-stone-800', border: 'border-stone-400' },
};

const TYPE_BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  SIGMET: { bg: 'bg-red-100', text: 'text-red-800' },
  AIRMET: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  CONVECTIVE_SIGMET: { bg: 'bg-red-200', text: 'text-red-900' },
};

function getHazardStyle(hazard: string) {
  // Check for partial matches (e.g., "MTN OBSCN" in hazard string)
  for (const [key, style] of Object.entries(HAZARD_STYLES)) {
    if (hazard.toUpperCase().includes(key)) {
      return style;
    }
  }
  return { bg: 'bg-stone-50', text: 'text-stone-800', border: 'border-stone-400' };
}

function getTypeBadgeStyle(type: string) {
  return TYPE_BADGE_STYLES[type] || { bg: 'bg-stone-100', text: 'text-stone-800' };
}

function formatTypeLabel(type: string): string {
  switch (type) {
    case 'CONVECTIVE_SIGMET':
      return 'Conv. SIGMET';
    default:
      return type;
  }
}

function formatAltitude(alt: number | null): string {
  if (alt === null) return 'SFC';
  if (alt === 0) return 'SFC';
  return `FL${Math.round(alt / 100).toString().padStart(3, '0')}`;
}

function AirSigmetDisplay({ airSigmets }: AirSigmetDisplayProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (airSigmets.length === 0) {
    return null;
  }

  // Sort: SIGMETs first, then AIRMETs, by validity time
  const sorted = [...airSigmets].sort((a, b) => {
    const typeOrder = { SIGMET: 0, CONVECTIVE_SIGMET: 0, AIRMET: 1 };
    const aOrder = typeOrder[a.type] ?? 2;
    const bOrder = typeOrder[b.type] ?? 2;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(a.validFrom).getTime() - new Date(b.validFrom).getTime();
  });

  return (
    <div className="bg-white dark:bg-stone-800 rounded-lg shadow-sm border border-stone-200 dark:border-stone-700 p-6">
      <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        SIGMETs / AIRMETs ({airSigmets.length})
      </h2>

      <div className="space-y-2">
        {sorted.map((item) => {
          const isExpanded = expandedId === item.id;
          const hazardStyle = getHazardStyle(item.hazard);
          const typeBadge = getTypeBadgeStyle(item.type);

          return (
            <div
              key={item.id}
              className={`border-l-4 rounded-lg overflow-hidden border ${hazardStyle.border}`}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className={`w-full text-left px-4 py-3 hover:bg-opacity-80 transition-colors ${hazardStyle.bg}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBadge.bg} ${typeBadge.text}`}>
                      {formatTypeLabel(item.type)}
                    </span>
                    <span className={`text-sm font-semibold ${hazardStyle.text}`}>
                      {item.hazard}
                    </span>
                    {item.severity && item.severity !== 'Unknown' && (
                      <span className="text-xs text-stone-600">
                        ({item.severity})
                      </span>
                    )}
                    <span className="text-xs text-stone-500">
                      {formatAltitude(item.altitudeLow)} - {formatAltitude(item.altitudeHigh)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      className={`w-4 h-4 text-stone-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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
                <div className="px-4 py-3 bg-white dark:bg-stone-800 border-t border-stone-200 dark:border-stone-700">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <span className="text-stone-500">Type:</span>{' '}
                      <span className="font-medium">{formatTypeLabel(item.type)}</span>
                    </div>
                    <div>
                      <span className="text-stone-500">Hazard:</span>{' '}
                      <span className="font-medium">{item.hazard}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-stone-500">Valid from:</span>{' '}
                      <DualTime time={item.validFrom} size="sm" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-stone-500">Valid to:</span>{' '}
                      <DualTime time={item.validTo} size="sm" />
                    </div>
                    <div>
                      <span className="text-stone-500">Altitude range:</span>{' '}
                      <span className="font-medium">
                        {formatAltitude(item.altitudeLow)} - {formatAltitude(item.altitudeHigh)}
                      </span>
                    </div>
                    {item.severity && item.severity !== 'Unknown' && (
                      <div>
                        <span className="text-stone-500">Severity:</span>{' '}
                        <span className="font-medium">{item.severity}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2 bg-stone-100 dark:bg-stone-700 rounded font-data text-xs text-stone-700 dark:text-stone-300 break-all whitespace-pre-wrap">
                    {item.rawText}
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

export default AirSigmetDisplay;
