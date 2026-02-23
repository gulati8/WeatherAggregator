import { Trip, TripLeg, MAX_TRIP_LEGS } from '../../types/trip';
import TripLegInput from './TripLegInput';

interface TripBuilderProps {
  trip: Trip;
  onTripNameChange: (name: string) => void;
  onUpdateLeg: (legId: string, updates: Partial<TripLeg>) => void;
  onRemoveLeg: (legId: string) => void;
  onAddLeg: () => void;
  canAddLeg: boolean;
}

function TripBuilder({
  trip,
  onTripNameChange,
  onUpdateLeg,
  onRemoveLeg,
  onAddLeg,
  canAddLeg,
}: TripBuilderProps) {
  // Generate default trip name from airports
  const generateDefaultName = (): string => {
    if (trip.legs.length === 0) return '';
    const airports = [trip.legs[0].departureAirport];
    trip.legs.forEach((leg) => {
      if (leg.arrivalAirport) airports.push(leg.arrivalAirport);
    });
    return airports.filter(Boolean).join('-');
  };

  const displayName = trip.name || generateDefaultName() || 'New Trip';

  return (
    <div className="bg-stone-50 dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
      {/* Trip header */}
      <div className="p-4 border-b border-stone-200 dark:border-stone-700">
        <div className="flex items-center gap-3">
          <svg
            className="w-5 h-5 text-stone-400 dark:text-stone-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
          <input
            type="text"
            value={trip.name}
            onChange={(e) => onTripNameChange(e.target.value)}
            placeholder={displayName}
            className="flex-1 px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-md text-lg font-semibold focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100"
          />
        </div>
      </div>

      {/* Legs list */}
      <div className="p-4 space-y-3">
        {trip.legs.length === 0 ? (
          <div className="text-center py-8 text-stone-500 dark:text-stone-400">
            <svg
              className="w-12 h-12 mx-auto mb-3 text-stone-300 dark:text-stone-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
            <p>No legs added yet</p>
            <p className="text-sm">Click "Add Leg" to start building your trip</p>
          </div>
        ) : (
          trip.legs.map((leg, index) => (
            <TripLegInput
              key={leg.legId}
              leg={leg}
              index={index}
              onUpdate={onUpdateLeg}
              onRemove={onRemoveLeg}
              canRemove={trip.legs.length > 1}
            />
          ))
        )}

        {/* Add leg button */}
        <button
          type="button"
          onClick={onAddLeg}
          disabled={!canAddLeg}
          className={`w-full py-3 px-4 border-2 border-dashed rounded-lg flex items-center justify-center gap-2 transition-colors ${
            canAddLeg
              ? 'border-stone-300 dark:border-stone-500 text-stone-600 dark:text-stone-400 hover:border-teal-400 dark:hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20'
              : 'border-stone-200 dark:border-stone-700 text-stone-400 dark:text-stone-500 cursor-not-allowed'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Leg
          {!canAddLeg && (
            <span className="text-xs text-stone-400 dark:text-stone-500">
              (max {MAX_TRIP_LEGS} legs)
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

export default TripBuilder;
