import { TripLeg } from '../../types/trip';
import DualTime from '../DualTime';
import AirportAutocomplete from '../AirportAutocomplete';

interface TripLegInputProps {
  leg: TripLeg;
  index: number;
  onUpdate: (legId: string, updates: Partial<TripLeg>) => void;
  onRemove: (legId: string) => void;
  canRemove: boolean;
}

function TripLegInput({
  leg,
  index,
  onUpdate,
  onRemove,
  canRemove,
}: TripLegInputProps) {
  const validateIcao = (icao: string): boolean => {
    return /^[A-Za-z]{4}$/.test(icao);
  };

  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const formatTimeForInput = (date: Date): string => {
    return date.toTimeString().slice(0, 5);
  };

  const handleDateChange = (dateStr: string) => {
    const currentTime = leg.departureTime;
    const newDate = new Date(dateStr);
    newDate.setHours(currentTime.getHours(), currentTime.getMinutes());
    onUpdate(leg.legId, { departureTime: newDate });
  };

  const handleTimeChange = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const newDate = new Date(leg.departureTime);
    newDate.setHours(hours, minutes);
    onUpdate(leg.legId, { departureTime: newDate });
  };

  // Calculate arrival time for display
  const arrivalTime = new Date(
    leg.departureTime.getTime() + leg.estimatedFlightMinutes * 60 * 1000
  );

  // Calculate min/max dates
  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const depError = leg.departureAirport && !validateIcao(leg.departureAirport);
  const arrError = leg.arrivalAirport && !validateIcao(leg.arrivalAirport);

  return (
    <div className="bg-white dark:bg-stone-700 rounded-lg border border-stone-200 dark:border-stone-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-stone-600 dark:text-stone-400">Leg {index + 1}</span>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(leg.legId)}
            className="text-stone-400 hover:text-red-500 transition-colors"
            title="Remove leg"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-3">
        {/* Airports row - always side by side */}
        <div className="grid grid-cols-2 gap-3">
          {/* Departure Airport */}
          <div>
            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">
              From
            </label>
            <AirportAutocomplete
              value={leg.departureAirport}
              onChange={(v) =>
                onUpdate(leg.legId, { departureAirport: v })
              }
              placeholder="ICAO or city"
              inputClassName={`w-full px-3 py-3 border rounded-md font-data text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 ${
                depError ? 'border-red-300 dark:border-red-600' : 'border-stone-300 dark:border-stone-700'
              }`}
            />
          </div>

          {/* Arrival Airport */}
          <div>
            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">
              To
            </label>
            <AirportAutocomplete
              value={leg.arrivalAirport}
              onChange={(v) =>
                onUpdate(leg.legId, { arrivalAirport: v })
              }
              placeholder="ICAO or city"
              inputClassName={`w-full px-3 py-3 border rounded-md font-data text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 ${
                arrError ? 'border-red-300 dark:border-red-600' : 'border-stone-300 dark:border-stone-700'
              }`}
            />
          </div>
        </div>

        {/* Date/Time and Duration row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Departure Date/Time */}
          <div>
            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">
              Departure
            </label>
            <div className="flex flex-col sm:flex-row gap-1">
              <input
                type="date"
                value={formatDateForInput(leg.departureTime)}
                onChange={(e) => handleDateChange(e.target.value)}
                min={today}
                max={maxDate}
                className="flex-1 min-w-0 px-2 py-2 border border-stone-300 dark:border-stone-700 rounded-md text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
              <input
                type="time"
                value={formatTimeForInput(leg.departureTime)}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="w-full sm:w-20 px-2 py-2 border border-stone-300 dark:border-stone-700 rounded-md text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>
          </div>

          {/* Flight Duration */}
          <div>
            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">
              Duration
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={Math.floor(leg.estimatedFlightMinutes / 60)}
                onChange={(e) => {
                  const hours = Math.max(0, parseInt(e.target.value) || 0);
                  const mins = leg.estimatedFlightMinutes % 60;
                  onUpdate(leg.legId, {
                    estimatedFlightMinutes: hours * 60 + mins,
                  });
                }}
                min={0}
                max={24}
                className="w-12 sm:w-14 px-1 py-2 border border-stone-300 dark:border-stone-700 rounded-md text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
              <span className="text-xs text-stone-500 dark:text-stone-400">h</span>
              <input
                type="number"
                value={leg.estimatedFlightMinutes % 60}
                onChange={(e) => {
                  const hours = Math.floor(leg.estimatedFlightMinutes / 60);
                  const mins = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                  onUpdate(leg.legId, {
                    estimatedFlightMinutes: hours * 60 + mins,
                  });
                }}
                min={0}
                max={59}
                className="w-12 sm:w-14 px-1 py-2 border border-stone-300 dark:border-stone-700 rounded-md text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
              <span className="text-xs text-stone-500 dark:text-stone-400">m</span>
            </div>
          </div>
        </div>
      </div>

      {/* Arrival time display */}
      <div className="mt-2 text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1">
        <span>Arrival:</span>
        <DualTime time={arrivalTime} size="sm" />
      </div>
    </div>
  );
}

export default TripLegInput;
