import { WeatherAlert } from '../types/weather';
import { ALERT_SEVERITY_STYLES } from '../utils/colors';
import DualTime from './DualTime';

interface AlertDisplayProps {
  alerts: WeatherAlert[];
}

function AlertDisplay({ alerts }: AlertDisplayProps) {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <svg
          className="w-5 h-5 text-yellow-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        Weather Alerts ({alerts.length})
      </h2>

      <div className="space-y-3">
        {alerts.map((alert, index) => {
          const style = ALERT_SEVERITY_STYLES[alert.severity];
          return (
            <div
              key={index}
              className={`p-4 rounded-lg border-l-4 ${style.bg} ${style.border}`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 ${style.icon}`}>
                  {alert.severity === 'danger' && (
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  {alert.severity === 'warning' && (
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  {alert.severity === 'info' && (
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-semibold ${style.text}`}>
                      {alert.title}
                    </h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}
                    >
                      {alert.type}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 ${style.text}`}>
                    {alert.description.slice(0, 200)}
                    {alert.description.length > 200 && '...'}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      Valid: <DualTime time={alert.validFrom} size="sm" />
                    </span>
                    <span className="flex items-center gap-1">
                      Expires: <DualTime time={alert.validTo} size="sm" />
                    </span>
                  </div>
                  {alert.area && (
                    <div className="text-xs text-gray-500 mt-1">
                      Area: {alert.area}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AlertDisplay;
