import { useMemo } from 'react';
import { TripLegWeather } from '../../types/trip';
import { FlightCategory } from '../../types/weather';
import { FLIGHT_CATEGORY_STYLES } from '../../utils/colors';

interface TripTimelineProps {
  legs: TripLegWeather[];
  selectedLegId: string | null;
  onSelectLeg: (legId: string) => void;
}

function TripTimeline({ legs, selectedLegId, onSelectLeg }: TripTimelineProps) {
  // Calculate timeline range
  const timeRange = useMemo(() => {
    if (legs.length === 0) {
      const now = new Date();
      return {
        start: new Date(now.setHours(now.getHours() - 1)),
        end: new Date(now.setHours(now.getHours() + 12)),
      };
    }

    const allTimes = legs.flatMap((leg) => [
      new Date(leg.departureTime),
      new Date(leg.arrivalTime),
    ]);
    const minTime = Math.min(...allTimes.map((t) => t.getTime()));
    const maxTime = Math.max(...allTimes.map((t) => t.getTime()));

    // Add 1 hour padding on each side
    return {
      start: new Date(minTime - 60 * 60 * 1000),
      end: new Date(maxTime + 60 * 60 * 1000),
    };
  }, [legs]);

  // Generate time labels for the header
  const timeLabels = useMemo(() => {
    const labels: { time: Date; label: string }[] = [];
    const current = new Date(timeRange.start);
    current.setMinutes(0, 0, 0);

    while (current <= timeRange.end) {
      labels.push({
        time: new Date(current),
        label: current.toLocaleTimeString('en-US', {
          hour: 'numeric',
          hour12: true,
        }),
      });
      current.setHours(current.getHours() + 1);
    }
    return labels;
  }, [timeRange]);

  // Calculate position percentage for a time
  const getTimePosition = (time: Date): number => {
    const range = timeRange.end.getTime() - timeRange.start.getTime();
    const offset = time.getTime() - timeRange.start.getTime();
    return (offset / range) * 100;
  };

  // Get current time position
  const now = new Date();
  const nowPosition = getTimePosition(now);
  const showNowLine = nowPosition >= 0 && nowPosition <= 100;

  // Get color for leg status
  const getLegColor = (leg: TripLegWeather): string => {
    if (!leg.legStatus.canDispatch) return 'bg-red-500';
    const hasWarnings = leg.legStatus.issues.some((i) => i.severity === 'warning');
    const hasCautions = leg.legStatus.issues.some((i) => i.severity === 'caution');
    if (hasWarnings) return 'bg-red-400';
    if (hasCautions) return 'bg-yellow-400';
    return 'bg-green-500';
  };

  // Get color for flight category
  const getCategoryColor = (category: FlightCategory): string => {
    return FLIGHT_CATEGORY_STYLES[category].hex;
  };

  // Get border style based on source agreement
  const getAgreementBorder = (leg: TripLegWeather, type: 'departure' | 'arrival'): string => {
    const weather =
      type === 'departure' ? leg.departureAirport.weather : leg.arrivalAirport.weather;
    if (!weather) return 'border-2 border-gray-400';

    const agreement = weather.consensus?.overallAgreement;
    switch (agreement) {
      case 'strong':
        return 'border-2 border-solid';
      case 'moderate':
        return 'border-2 border-dashed';
      case 'weak':
        return 'border-2 border-dotted';
      default:
        return 'border-2 border-solid';
    }
  };

  if (legs.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>Add legs to see the timeline</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Trip Timeline</h3>

      {/* Timeline container - horizontal scroll on mobile */}
      <div className="relative overflow-x-auto">
        {/* Time header */}
        <div className="flex border-b border-gray-200 dark:border-gray-600 pb-2 mb-2">
          <div className="w-16 flex-shrink-0" /> {/* Label column spacer */}
          <div className="flex-1 relative h-6">
            {timeLabels.map((label, index) => (
              <div
                key={index}
                className="absolute text-xs text-gray-500 dark:text-gray-400 transform -translate-x-1/2"
                style={{ left: `${getTimePosition(label.time)}%` }}
              >
                {label.label}
              </div>
            ))}
          </div>
        </div>

        {/* Legs */}
        <div className="space-y-2">
          {legs.map((leg, index) => {
            const depTime = new Date(leg.departureTime);
            const arrTime = new Date(leg.arrivalTime);
            const startPos = getTimePosition(depTime);
            const endPos = getTimePosition(arrTime);
            const width = endPos - startPos;

            const depCategory = leg.legStatus.departureStatus.flightCategory;
            const arrCategory = leg.legStatus.arrivalStatus.flightCategory;

            return (
              <div
                key={leg.legId}
                className={`flex items-center cursor-pointer rounded transition-colors ${
                  selectedLegId === leg.legId ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                onClick={() => onSelectLeg(leg.legId)}
              >
                {/* Leg label */}
                <div className="w-16 flex-shrink-0 text-xs font-medium text-gray-600 dark:text-gray-400">
                  Leg {index + 1}
                </div>

                {/* Timeline row */}
                <div className="flex-1 relative h-10">
                  {/* Flight bar */}
                  <div
                    className={`absolute top-1/2 transform -translate-y-1/2 h-6 rounded-full ${getLegColor(
                      leg
                    )} flex items-center justify-center transition-all ${
                      selectedLegId === leg.legId ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-gray-800' : ''
                    }`}
                    style={{
                      left: `${startPos}%`,
                      width: `${Math.max(width, 2)}%`,
                    }}
                  >
                    {/* Departure marker */}
                    <div
                      className={`absolute left-0 w-4 h-4 rounded-full transform -translate-x-1/2 ${getAgreementBorder(
                        leg,
                        'departure'
                      )}`}
                      style={{ backgroundColor: getCategoryColor(depCategory) }}
                      title={`${leg.departureAirport.icao}: ${depCategory}`}
                    />

                    {/* Route text */}
                    <span className="text-xs font-medium text-white px-4 truncate">
                      {leg.departureAirport.icao} → {leg.arrivalAirport.icao}
                    </span>

                    {/* Arrival marker */}
                    <div
                      className={`absolute right-0 w-4 h-4 rounded-full transform translate-x-1/2 ${getAgreementBorder(
                        leg,
                        'arrival'
                      )}`}
                      style={{ backgroundColor: getCategoryColor(arrCategory) }}
                      title={`${leg.arrivalAirport.icao}: ${arrCategory}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current time indicator */}
        {showNowLine && (
          <div
            className="absolute top-6 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10"
            style={{ left: `calc(${nowPosition}% + 4rem)` }}
          >
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 text-xs text-red-500 font-medium whitespace-nowrap">
              NOW
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span>GO</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-yellow-400" />
            <span>Caution</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span>NO-GO</span>
          </div>
          <div className="w-full sm:w-auto sm:border-l sm:border-gray-300 dark:sm:border-gray-600 sm:pl-4 flex items-center gap-1 pt-2 sm:pt-0">
            <span className="w-3 h-3 rounded-full border-2 border-solid border-gray-400" />
            <span>Strong</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full border-2 border-dashed border-gray-400" />
            <span>Moderate</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full border-2 border-dotted border-gray-400" />
            <span>Weak</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TripTimeline;
