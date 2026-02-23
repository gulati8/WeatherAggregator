import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTripBuilder, useTripWeather, useSavedTrips } from '../hooks/useTrip';
import {
  TripBuilder,
  TripTimeline,
  TripLegCard,
  TripSummaryPanel,
} from '../components/trip';
import DualTime from '../components/DualTime';
import Card from '../components/ui/Card';
import { Trip } from '../types/trip';
import { GO_NOGO_FRIENDLY } from '../utils/personality';

function TripPlanner() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { trips, saveTrip, deleteTrip, getTrip } = useSavedTrips();
  const [selectedLegId, setSelectedLegId] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

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

  // Export trip as JSON
  const exportTrip = () => {
    const exportData = {
      ...trip,
      legs: trip.legs.map((leg) => ({
        ...leg,
        departureTime: leg.departureTime.toISOString(),
      })),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trip-${trip.name || trip.tripId.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import trip from JSON
  const importTrip = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const imported: Trip = {
          tripId: data.tripId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: data.name || '',
          legs: (data.legs || []).map((leg: Record<string, unknown>) => ({
            legId: leg.legId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            departureAirport: (leg.departureAirport as string) || '',
            arrivalAirport: (leg.arrivalAirport as string) || '',
            departureTime: new Date(leg.departureTime as string),
            estimatedFlightMinutes: (leg.estimatedFlightMinutes as number) || 120,
          })),
          createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
          updatedAt: new Date(),
        };
        loadTrip(imported);
        setSelectedLegId(null);
      } catch {
        alert('Failed to import trip: invalid JSON file');
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be re-imported
    if (importInputRef.current) {
      importInputRef.current.value = '';
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

  // Trip health summary from weather data
  const tripHealth = useMemo(() => {
    if (!tripWeather || tripWeather.legs.length === 0) return null;
    const firstLeg = tripWeather.legs[0];
    const lastLeg = tripWeather.legs[tripWeather.legs.length - 1];
    return {
      departure: {
        icao: firstLeg.departureAirport.icao,
        canDispatch: firstLeg.legStatus.departureStatus.canDispatch,
      },
      enRoute: {
        worstCategory: tripWeather.summary.worstFlightCategory,
        issues: tripWeather.summary.criticalIssues.length,
      },
      arrival: {
        icao: lastLeg.arrivalAirport.icao,
        canDispatch: lastLeg.legStatus.arrivalStatus.canDispatch,
      },
    };
  }, [tripWeather]);

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-stone-900">
      {/* Header */}
      <header className="bg-white dark:bg-stone-800 shadow-card border-b border-stone-200 dark:border-stone-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4">
              <h1 className="text-lg sm:text-xl font-bold font-display text-stone-900 dark:text-stone-100">Trip Planner</h1>
              {trip.name && (
                <span className="text-stone-500 dark:text-stone-400 text-sm sm:text-base truncate max-w-[120px] sm:max-w-none">- {trip.name}</span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {tripId && (
                <button
                  onClick={handleDelete}
                  className="px-3 sm:px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                >
                  Delete
                </button>
              )}
              <button
                onClick={exportTrip}
                disabled={trip.legs.length === 0}
                className="px-3 sm:px-4 py-2 text-sm border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 rounded-md hover:bg-stone-50 dark:hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Export
              </button>
              <label className="px-3 sm:px-4 py-2 text-sm border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 rounded-md hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors cursor-pointer">
                Import
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".json"
                  onChange={importTrip}
                  className="hidden"
                />
              </label>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={trip.legs.length === 0}
                className="px-3 sm:px-4 py-2 text-sm bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:bg-stone-300 dark:disabled:bg-stone-600 disabled:cursor-not-allowed transition-colors"
              >
                Save
              </motion.button>
              <button
                onClick={handleNewTrip}
                className="px-3 sm:px-4 py-2 text-sm border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 rounded-md hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
              >
                New
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Saved trips selector */}
        {trips.length > 0 && !tripId && (
          <Card padding="md">
            <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3">
              Saved Trips
            </h3>
            <div className="flex flex-wrap gap-2">
              {trips.map((t) => (
                <button
                  key={t.tripId}
                  onClick={() => navigate(`/trip/${t.tripId}`)}
                  className="px-3 py-2 text-sm bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 rounded-md transition-colors text-stone-900 dark:text-stone-100"
                >
                  {t.name || `Trip ${t.tripId.slice(0, 8)}`}
                  <span className="ml-2 text-xs text-stone-500 dark:text-stone-400">
                    ({t.legs.length} legs)
                  </span>
                </button>
              ))}
            </div>
          </Card>
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
          <Card padding="md">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* ETD */}
              <div className="flex flex-col">
                <span className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-1">
                  ETD - {tripTimes.departureAirport}
                </span>
                <DualTime time={tripTimes.etd} layout="stacked" size="md" />
              </div>

              {/* ETA */}
              <div className="flex flex-col">
                <span className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-1">
                  ETA - {tripTimes.arrivalAirport}
                </span>
                <DualTime time={tripTimes.eta} layout="stacked" size="md" />
              </div>

              {/* Flight Time */}
              <div className="flex flex-col">
                <span className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-1">
                  Total Flight Time
                </span>
                <span className="text-sm font-medium font-data text-stone-700 dark:text-stone-300">
                  {Math.floor(tripTimes.totalFlightMinutes / 60)}h {tripTimes.totalFlightMinutes % 60}m
                </span>
              </div>

              {/* Trip Duration */}
              <div className="flex flex-col">
                <span className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-1">
                  Trip Duration
                </span>
                <span className="text-sm font-medium font-data text-stone-700 dark:text-stone-300">
                  {Math.floor(tripTimes.totalTripMinutes / 60)}h {tripTimes.totalTripMinutes % 60}m
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Get Weather button */}
        {trip.legs.length > 0 && (
          <div className="flex items-center justify-between">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={refresh}
              disabled={loading || !isValidTrip()}
              className="px-6 py-3 bg-teal-600 text-white rounded-card font-semibold hover:bg-teal-700 disabled:bg-stone-300 dark:disabled:bg-stone-600 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
            </motion.button>
            {!isValidTrip() && (
              <span className="text-sm text-yellow-600 dark:text-yellow-400">
                Fill in all airport codes to get weather
              </span>
            )}
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-card text-red-700 dark:text-red-300">
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

        {/* Trip Health Cards */}
        {tripHealth && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card hover padding="md">
              <div className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-1">Departure</div>
              <div className="font-data font-bold text-lg text-stone-900 dark:text-stone-100">{tripHealth.departure.icao}</div>
              <div className={`text-sm font-medium mt-1 ${tripHealth.departure.canDispatch ? 'text-green-600' : 'text-red-600'}`}>
                {tripHealth.departure.canDispatch ? 'GO' : 'NO-GO'}
              </div>
              <div className="text-xs text-stone-400 mt-0.5">
                {tripHealth.departure.canDispatch
                  ? GO_NOGO_FRIENDLY['GO']
                  : GO_NOGO_FRIENDLY['NO-GO']}
              </div>
            </Card>
            <Card hover padding="md">
              <div className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-1">En Route</div>
              <div className="font-data font-bold text-lg text-stone-900 dark:text-stone-100">
                Worst: {tripHealth.enRoute.worstCategory}
              </div>
              <div className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                {tripHealth.enRoute.issues === 0
                  ? 'No critical issues'
                  : `${tripHealth.enRoute.issues} issue${tripHealth.enRoute.issues !== 1 ? 's' : ''}`}
              </div>
            </Card>
            <Card hover padding="md">
              <div className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-1">Arrival</div>
              <div className="font-data font-bold text-lg text-stone-900 dark:text-stone-100">{tripHealth.arrival.icao}</div>
              <div className={`text-sm font-medium mt-1 ${tripHealth.arrival.canDispatch ? 'text-green-600' : 'text-red-600'}`}>
                {tripHealth.arrival.canDispatch ? 'GO' : 'NO-GO'}
              </div>
              <div className="text-xs text-stone-400 mt-0.5">
                {tripHealth.arrival.canDispatch
                  ? GO_NOGO_FRIENDLY['GO']
                  : GO_NOGO_FRIENDLY['NO-GO']}
              </div>
            </Card>
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
          <Card padding="lg" className="text-center">
            <svg
              className="w-16 h-16 mx-auto text-stone-300 dark:text-stone-600 mb-4"
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
            <h3 className="text-lg font-semibold font-display text-stone-900 dark:text-stone-100 mb-2">
              Plan Your Multi-Leg Trip
            </h3>
            <p className="text-stone-600 dark:text-stone-400 mb-4 max-w-md mx-auto">
              Add flight legs to see weather conditions at each departure and
              arrival airport. Get GO/NO-GO guidance based on Part 135 minimums
              and compare data from multiple weather sources.
            </p>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => addLeg()}
              className="px-6 py-3 bg-teal-600 text-white rounded-card font-semibold hover:bg-teal-700 transition-colors"
            >
              Add First Leg
            </motion.button>
          </Card>
        )}
      </main>
    </div>
  );
}

export default TripPlanner;
