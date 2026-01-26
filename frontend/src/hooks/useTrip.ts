import { useState, useEffect, useCallback } from 'react';
import { tripApi } from '../api/client';
import { Trip, TripLeg, TripWeatherResponse, MAX_TRIP_LEGS } from '../types/trip';

// Generate unique IDs
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Trip weather hook
interface UseTripWeatherResult {
  data: TripWeatherResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useTripWeather(trip: Trip | null): UseTripWeatherResult {
  const [data, setData] = useState<TripWeatherResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTripWeather = useCallback(async () => {
    if (!trip || trip.legs.length === 0) {
      setData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await tripApi.getTripWeather(trip);
      setData(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch trip weather';
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [trip]);

  useEffect(() => {
    fetchTripWeather();
  }, [fetchTripWeather]);

  const refresh = useCallback(async () => {
    await fetchTripWeather();
  }, [fetchTripWeather]);

  return { data, loading, error, refresh };
}

// Saved trips hook (localStorage)
const TRIPS_KEY = 'weather-aggregator-trips';

function getStoredTrips(): Trip[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(TRIPS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    // Convert date strings back to Date objects
    return parsed.map((trip: Trip) => ({
      ...trip,
      createdAt: new Date(trip.createdAt),
      updatedAt: new Date(trip.updatedAt),
      legs: trip.legs.map((leg: TripLeg) => ({
        ...leg,
        departureTime: new Date(leg.departureTime),
      })),
    }));
  } catch {
    return [];
  }
}

// Serialize trip for storage, stripping any non-serializable properties
function serializeTrip(trip: Trip): object {
  return {
    tripId: trip.tripId,
    name: trip.name,
    createdAt: trip.createdAt instanceof Date ? trip.createdAt.toISOString() : trip.createdAt,
    updatedAt: trip.updatedAt instanceof Date ? trip.updatedAt.toISOString() : trip.updatedAt,
    legs: trip.legs.map((leg) => ({
      legId: leg.legId,
      departureAirport: leg.departureAirport,
      arrivalAirport: leg.arrivalAirport,
      departureTime: leg.departureTime instanceof Date ? leg.departureTime.toISOString() : leg.departureTime,
      estimatedFlightMinutes: leg.estimatedFlightMinutes,
    })),
  };
}

function saveTrips(trips: Trip[]): void {
  const serialized = trips.map(serializeTrip);
  localStorage.setItem(TRIPS_KEY, JSON.stringify(serialized));
}

export function useSavedTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    setTrips(getStoredTrips());
  }, []);

  const saveTrip = useCallback((trip: Trip) => {
    setTrips((prev) => {
      const existing = prev.findIndex((t) => t.tripId === trip.tripId);
      let updated: Trip[];
      if (existing >= 0) {
        updated = [...prev];
        updated[existing] = { ...trip, updatedAt: new Date() };
      } else {
        updated = [...prev, { ...trip, createdAt: new Date(), updatedAt: new Date() }];
      }
      saveTrips(updated);
      return updated;
    });
  }, []);

  const deleteTrip = useCallback((tripId: string) => {
    setTrips((prev) => {
      const updated = prev.filter((t) => t.tripId !== tripId);
      saveTrips(updated);
      return updated;
    });
  }, []);

  const getTrip = useCallback(
    (tripId: string): Trip | undefined => {
      return trips.find((t) => t.tripId === tripId);
    },
    [trips]
  );

  return { trips, saveTrip, deleteTrip, getTrip };
}

// Trip builder hook for managing trip state
interface UseTripBuilderResult {
  trip: Trip;
  setTripName: (name: string) => void;
  addLeg: (leg?: Partial<TripLeg>) => void;
  updateLeg: (legId: string, updates: Partial<TripLeg>) => void;
  removeLeg: (legId: string) => void;
  shiftAllTimes: (minutes: number) => void;
  loadTrip: (trip: Trip) => void;
  resetTrip: () => void;
  canAddLeg: boolean;
}

function createEmptyTrip(): Trip {
  return {
    tripId: generateId(),
    name: '',
    legs: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createDefaultLeg(prevLeg?: TripLeg): TripLeg {
  // Default departure time: 1 hour from now, or after prev leg arrival
  let defaultTime = new Date();
  defaultTime.setMinutes(0, 0, 0);
  defaultTime.setHours(defaultTime.getHours() + 1);

  if (prevLeg) {
    // Set departure time to prev leg arrival + 30 min ground time
    const prevArrival = new Date(
      prevLeg.departureTime.getTime() + prevLeg.estimatedFlightMinutes * 60 * 1000
    );
    defaultTime = new Date(prevArrival.getTime() + 30 * 60 * 1000);
  }

  return {
    legId: generateId(),
    departureAirport: prevLeg?.arrivalAirport || '',
    arrivalAirport: '',
    departureTime: defaultTime,
    estimatedFlightMinutes: 120, // Default 2 hours
  };
}

export function useTripBuilder(initialTrip?: Trip): UseTripBuilderResult {
  const [trip, setTrip] = useState<Trip>(initialTrip || createEmptyTrip());

  const setTripName = useCallback((name: string) => {
    setTrip((prev) => ({ ...prev, name, updatedAt: new Date() }));
  }, []);

  const addLeg = useCallback((leg?: Partial<TripLeg>) => {
    setTrip((prev) => {
      if (prev.legs.length >= MAX_TRIP_LEGS) return prev;

      const prevLeg = prev.legs[prev.legs.length - 1];
      const newLeg: TripLeg = {
        ...createDefaultLeg(prevLeg),
        ...leg,
        legId: leg?.legId || generateId(),
      };

      return {
        ...prev,
        legs: [...prev.legs, newLeg],
        updatedAt: new Date(),
      };
    });
  }, []);

  const updateLeg = useCallback((legId: string, updates: Partial<TripLeg>) => {
    setTrip((prev) => ({
      ...prev,
      legs: prev.legs.map((leg) =>
        leg.legId === legId ? { ...leg, ...updates } : leg
      ),
      updatedAt: new Date(),
    }));
  }, []);

  const removeLeg = useCallback((legId: string) => {
    setTrip((prev) => ({
      ...prev,
      legs: prev.legs.filter((leg) => leg.legId !== legId),
      updatedAt: new Date(),
    }));
  }, []);

  const shiftAllTimes = useCallback((minutes: number) => {
    setTrip((prev) => ({
      ...prev,
      legs: prev.legs.map((leg) => ({
        ...leg,
        departureTime: new Date(leg.departureTime.getTime() + minutes * 60 * 1000),
      })),
      updatedAt: new Date(),
    }));
  }, []);

  const loadTrip = useCallback((newTrip: Trip) => {
    setTrip(newTrip);
  }, []);

  const resetTrip = useCallback(() => {
    setTrip(createEmptyTrip());
  }, []);

  const canAddLeg = trip.legs.length < MAX_TRIP_LEGS;

  return {
    trip,
    setTripName,
    addLeg,
    updateLeg,
    removeLeg,
    shiftAllTimes,
    loadTrip,
    resetTrip,
    canAddLeg,
  };
}
