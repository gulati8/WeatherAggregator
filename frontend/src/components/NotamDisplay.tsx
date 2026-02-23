import { useState, useEffect } from 'react';
import api from '../api/client';

interface Notam {
  id: string;
  type: string;
  classification: 'Aerodrome' | 'Airspace' | 'Obstacle' | 'Procedure' | 'Navigation' | 'Other';
  icao: string;
  effectiveStart: string;
  effectiveEnd: string;
  text: string;
  isActive: boolean;
  priority: 'high' | 'medium' | 'low';
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'border-red-500 bg-red-50 dark:bg-red-900/20',
  medium: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
  low: 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800',
};

const PRIORITY_LABELS: Record<string, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const CLASSIFICATIONS = ['All', 'Aerodrome', 'Airspace', 'Obstacle', 'Procedure', 'Navigation', 'Other'] as const;

export default function NotamDisplay({ icao }: { icao: string }) {
  const [notams, setNotams] = useState<Notam[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('All');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!icao) return;
    setLoading(true);
    setError(null);

    api
      .get<{ notams: Notam[] }>(`/weather/${icao}/notams`)
      .then((res) => {
        setNotams(res.data.notams || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Unable to load NOTAMs');
        setLoading(false);
      });
  }, [icao]);

  const filtered = filter === 'All'
    ? notams
    : notams.filter((n) => n.classification === filter);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          NOTAMs
          {notams.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">({filtered.length})</span>
          )}
        </h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
        >
          {CLASSIFICATIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Loading NOTAMs...
        </div>
      )}

      {error && (
        <div className="text-sm text-gray-500 dark:text-gray-400">{error}</div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          No NOTAMs found.
        </div>
      )}

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {filtered.map((notam) => {
          const isExpanded = expandedIds.has(notam.id);
          const textPreview = notam.text.length > 120 && !isExpanded
            ? notam.text.slice(0, 120) + '...'
            : notam.text;

          return (
            <div
              key={notam.id}
              className={`border-l-4 rounded-r-lg p-3 cursor-pointer ${PRIORITY_COLORS[notam.priority]}`}
              onClick={() => toggleExpand(notam.id)}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300">
                  {notam.id}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                  {notam.classification}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  notam.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                  : notam.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {PRIORITY_LABELS[notam.priority]}
                </span>
                {!notam.isActive && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-300 text-gray-700">
                    Expired
                  </span>
                )}
              </div>
              {notam.effectiveStart && (
                <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">
                  {new Date(notam.effectiveStart).toLocaleString()}
                  {notam.effectiveEnd && (
                    <> — {new Date(notam.effectiveEnd).toLocaleString()}</>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">
                {textPreview}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
