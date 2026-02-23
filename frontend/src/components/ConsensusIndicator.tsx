import { ConsensusAnalysis } from '../types/weather';
import { SEVERITY_STYLES } from '../utils/colors';

interface ConsensusIndicatorProps {
  consensus: ConsensusAnalysis;
}

function ConsensusIndicator({ consensus }: ConsensusIndicatorProps) {
  const agreementColors = {
    strong: {
      bg: 'bg-green-100 dark:bg-green-900/40',
      border: 'border-green-500',
      text: 'text-green-800 dark:text-green-300',
      bar: 'bg-green-500',
    },
    moderate: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/40',
      border: 'border-yellow-500',
      text: 'text-yellow-800 dark:text-yellow-300',
      bar: 'bg-yellow-500',
    },
    weak: {
      bg: 'bg-red-100 dark:bg-red-900/40',
      border: 'border-red-500',
      text: 'text-red-800 dark:text-red-300',
      bar: 'bg-red-500',
    },
  };

  const style = agreementColors[consensus.overallAgreement];

  return (
    <div className="bg-white dark:bg-stone-800 rounded-lg shadow-sm border border-stone-200 dark:border-stone-700 p-6">
      <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">
        Source Consensus
      </h2>

      {/* Confidence meter */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
            Confidence Score
          </span>
          <span className={`text-lg font-bold ${style.text}`}>
            {consensus.confidenceScore}%
          </span>
        </div>
        <div className="w-full h-3 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${style.bar} transition-all duration-500`}
            style={{ width: `${consensus.confidenceScore}%` }}
          />
        </div>
      </div>

      {/* Overall agreement badge */}
      <div
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${style.bg} ${style.border} ${style.text} mb-4`}
      >
        {consensus.overallAgreement === 'strong' && (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        )}
        {consensus.overallAgreement === 'moderate' && (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        )}
        {consensus.overallAgreement === 'weak' && (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        )}
        <span className="font-semibold capitalize">
          {consensus.overallAgreement} Agreement
        </span>
      </div>

      {/* Disagreement areas */}
      {consensus.disagreementAreas.length > 0 ? (
        <div>
          <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
            Disagreement Areas
          </h3>
          <div className="space-y-2">
            {consensus.disagreementAreas.map((item, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg ${
                  SEVERITY_STYLES[item.severity].bg
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-medium ${
                      SEVERITY_STYLES[item.severity].text
                    }`}
                  >
                    {item.parameter}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      SEVERITY_STYLES[item.severity].bg
                    } ${SEVERITY_STYLES[item.severity].text}`}
                  >
                    {item.severity}
                  </span>
                </div>
                <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">{item.description}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(item.sourceValues).map(([source, value]) => (
                    <span
                      key={source}
                      className="text-xs bg-white/50 dark:bg-stone-800/50 px-2 py-1 rounded"
                    >
                      {source}: {value}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-stone-600 dark:text-stone-400">
          All sources are in agreement on the reported weather parameters.
        </p>
      )}
    </div>
  );
}

export default ConsensusIndicator;
