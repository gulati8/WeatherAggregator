import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTripBuilder, useTripWeather, useSavedTrips } from '../hooks/useTrip';
import {
  TripBuilder,
  TripTimeline,
  TripLegCard,
  TripSummaryPanel,
} from '../components/trip';
import DualTime from '../components/DualTime';

function TripPlanner() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { trips, saveTrip, deleteTrip, getTrip } = useSavedTrips();
  const [selectedLegId, setSelectedLegId] = useState<string | null>(null);

  // Load trip from URL param or create new
  const existingTrip = tripId ? getTrip(tripId) : undefined;

  const {
    trip,
    setTripName,
    addLeg,
    updateLeg,
    removeLeg,
    shiftAllTimes,
    loadTrip,
    resetTrip,
    canAddLeg,
  } = useTripBuilder(existingTrip);

  // Fetch weather for the trip
  const { data: tripWeather, loading, error, refresh } = useTripWeather(
    trip.legs.length > 0 ? trip : null
  );

  // Load trip from URL param when it changes
  useEffect(() => {
    if (tripId && existingTrip) {
      loadTrip(existingTrip);
    }
  }, [tripId, existingTrip, loadTrip]);

  // Select first leg when weather data loads
  useEffect(() => {
    if (tripWeather?.legs.length && !selectedLegId) {
      setSelectedLegId(tripWeather.legs[0].legId);
    }
  }, [tripWeather, selectedLegId]);

  // Validate all legs before allowing weather fetch
  const isValidTrip = useCallback((): boolean => {
    if (trip.legs.length === 0) return false;
    return trip.legs.every(
      (leg) =>
        /^[A-Z]{4}$/i.test(leg.departureAirport) &&
        /^[A-Z]{4}$/i.test(leg.arrivalAirport) &&
        leg.estimatedFlightMinutes > 0
    );
  }, [trip]);

  // Handle save
  const handleSave = () => {
    saveTrip(trip);
    navigate(`/trip/${trip.tripId}`);
  };

  // Handle new trip
  const handleNewTrip = () => {
    resetTrip();
    setSelectedLegId(null);
    navigate('/trip');
  };

  // Handle delete
  const handleDelete = () => {
    if (tripId && confirm('Delete this trip?')) {
      deleteTrip(tripId);
      handleNewTrip();
    }
  };

  // Get selected leg weather data
  const selectedLegWeather = selectedLegId
    ? tripWeather?.legs.find((l) => l.legId === selectedLegId)
    : null;

  // Calculate ETD (first leg departure) and ETA (last leg arrival)
  const tripTimes = useMemo(() => {
    if (trip.legs.length === 0) return null;

    const firstLeg = trip.legs[0];
    const lastLeg = trip.legs[trip.legs.length - 1];
    const etd = firstLeg.departureTime;
    const eta = new Date(
      lastLeg.departureTime.getTime() + lastLeg.estimatedFlightMinutes * 60 * 1000
    );

    // Calculate total flight time
    let totalFlightMinutes = 0;
    trip.legs.forEach((leg) => {
      totalFlightMinutes += leg.estimatedFlightMinutes;
    });

    // Calculate total trip duration (from first departure to last arrival)
    const totalTripMinutes = Math.round((eta.getTime() - etd.getTime()) / 60000);

    return {
      etd,
      eta,
      totalFlightMinutes,
      totalTripMinutes,
      departureAirport: firstLeg.departureAirport,
      arrivalAirport: lastLeg.arrivalAirport,
    };
  }, [trip.legs]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Trip Planner</h1>
              {trip.name && (
                <span className="text-gray-500 text-sm sm:text-base truncate max-w-[120px] sm:max-w-none">- {trip.name}</span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {tripId && (
                <button
                  onClick={handleDelete}
                  className="px-3 sm:px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                >
                  Delete
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={trip.legs.length === 0}
                className="px-3 sm:px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleNewTrip}
                className="px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                New
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Saved trips selector */}
        {trips.length > 0 && !tripId && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Saved Trips
            </h3>
            <div className="flex flex-wrap gap-2">
              {trips.map((t) => (
                <button
                  key={t.tripId}
                  onClick={() => navigate(`/trip/${t.tripId}`)}
                  className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  {t.name || `Trip ${t.tripId.slice(0, 8)}`}
                  <span className="ml-2 text-xs text-gray-500">
                    ({t.legs.length} legs)
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trip Builder */}
        <TripBuilder
          trip={trip}
          onTripNameChange={setTripName}
          onUpdateLeg={updateLeg}
          onRemoveLeg={removeLeg}
          onAddLeg={addLeg}
          canAddLeg={canAddLeg}
        />

        {/* ETD/ETA Display */}
        {tripTimes && tripTimes.departureAirport && tripTimes.arrivalAirport && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* ETD */}
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  ETD - {tripTimes.departureAirport}
                </span>
                <DualTime time={tripTimes.etd} layout="stacked" size="md" />
              </div>

              {/* ETA */}
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  ETA - {tripTimes.arrivalAirport}
                </span>
                <DualTime time={tripTimes.eta} layout="stacked" size="md" />
              </div>

              {/* Flight Time */}
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Total Flight Time
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {Math.floor(tripTimes.totalFlightMinutes / 60)}h {tripTimes.totalFlightMinutes % 60}m
                </span>
              </div>

              {/* Trip Duration */}
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Trip Duration
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {Math.floor(tripTimes.totalTripMinutes / 60)}h {tripTimes.totalTripMinutes % 60}m
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Get Weather button */}
        {trip.legs.length > 0 && (
          <div className="flex items-center justify-between">
            <button
              onClick={refresh}
              disabled={loading || !isValidTrip()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Loading Weather...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Get Weather
                </>
              )}
            </button>
            {!isValidTrip() && (
              <span className="text-sm text-yellow-600">
                Fill in all airport codes to get weather
              </span>
            )}
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Trip Summary and Timeline */}
        {tripWeather && (
          <>
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <TripTimeline
                  legs={tripWeather.legs}
                  selectedLegId={selectedLegId}
                  onSelectLeg={setSelectedLegId}
                />
              </div>
              <div>
                <TripSummaryPanel
                  summary={tripWeather.summary}
                  onShiftTimes={shiftAllTimes}
                  loading={loading}
                />
              </div>
            </div>

            {/* Selected leg details */}
            {selectedLegWeather && (
              <TripLegCard
                leg={selectedLegWeather}
                index={tripWeather.legs.findIndex(
                  (l) => l.legId === selectedLegId
                )}
              />
            )}
          </>
        )}

        {/* Empty state with instructions */}
        {trip.legs.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <svg
              className="w-16 h-16 mx-auto text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Plan Your Multi-Leg Trip
            </h3>
            <p className="text-gray-600 mb-4 max-w-md mx-auto">
              Add flight legs to see weather conditions at each departure and
              arrival airport. Get GO/NO-GO guidance based on Part 135 minimums
              and compare data from multiple weather sources.
            </p>
            <button
              onClick={() => addLeg()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Add First Leg
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default TripPlanner;
