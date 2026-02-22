import { useState } from 'react';
import { FratResult } from '../types/weather';

interface FratDisplayProps {
  frat: FratResult;
}

function FratDisplay({ frat }: FratDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getRiskColor = (level: FratResult['riskLevel']) => {
    switch (level) {
      case 'LOW':
        return {
          bg: 'bg-green-50',
          border: 'border-green-500',
          text: 'text-green-700',
          badge: 'bg-green-100 text-green-800',
          bar: 'bg-green-500',
        };
      case 'MODERATE':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-500',
          text: 'text-yellow-700',
          badge: 'bg-yellow-100 text-yellow-800',
          bar: 'bg-yellow-500',
        };
      case 'HIGH':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-500',
          text: 'text-orange-700',
          badge: 'bg-orange-100 text-orange-800',
          bar: 'bg-orange-500',
        };
      case 'CRITICAL':
        return {
          bg: 'bg-red-50',
          border: 'border-red-500',
          text: 'text-red-700',
          badge: 'bg-red-100 text-red-800',
          bar: 'bg-red-500',
        };
    }
  };

  const colors = getRiskColor(frat.riskLevel);

  // Group factors by category
  const groupedFactors = frat.factors.reduce<Record<string, typeof frat.factors>>(
    (groups, factor) => {
      if (!groups[factor.category]) {
        groups[factor.category] = [];
      }
      groups[factor.category].push(factor);
      return groups;
    },
    {},
  );

  // Score gauge: clamp at 50 for display purposes
  const gaugePercent = Math.min((frat.totalScore / 50) * 100, 100);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Flight Risk Assessment
        </h2>
        <span
          className={`px-3 py-1 rounded-full text-sm font-bold ${colors.badge}`}
        >
          {frat.riskLevel}
        </span>
      </div>

      {/* Score gauge */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">Risk Score</span>
          <span className={`text-2xl font-bold ${colors.text}`}>
            {frat.totalScore}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${colors.bar}`}
            style={{ width: `${gaugePercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-400">
          <span>0</span>
          <span>10</span>
          <span>25</span>
          <span>40</span>
          <span>50+</span>
        </div>
        {/* Risk level labels */}
        <div className="flex justify-between mt-0.5 text-xs">
          <span className="text-green-600">Low</span>
          <span className="text-yellow-600">Moderate</span>
          <span className="text-orange-600">High</span>
          <span className="text-red-600">Critical</span>
        </div>
      </div>

      {/* Recommendation */}
      <div
        className={`p-3 rounded-lg border ${colors.bg} ${colors.border} mb-4`}
      >
        <p className={`text-sm font-medium ${colors.text}`}>
          {frat.recommendation}
        </p>
      </div>

      {/* Factors summary / expand toggle */}
      {frat.factors.length > 0 ? (
        <div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            <span>
              {frat.factors.length} risk factor{frat.factors.length !== 1 ? 's' : ''}{' '}
              identified
            </span>
            <svg
              className={`w-5 h-5 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {isExpanded && (
            <div className="mt-2 space-y-4">
              {Object.entries(groupedFactors).map(([category, factors]) => (
                <div key={category}>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {category}
                  </h4>
                  <div className="space-y-2">
                    {factors.map((factor, index) => (
                      <div
                        key={index}
                        className="flex items-start justify-between p-2 bg-gray-50 rounded"
                      >
                        <div className="flex-1 min-w-0 mr-2">
                          <p className="text-sm font-medium text-gray-800">
                            {factor.factor}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {factor.description}
                          </p>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gray-200 text-gray-700 whitespace-nowrap">
                          +{factor.points}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No risk factors identified.</p>
      )}
    </div>
  );
}

export default FratDisplay;
