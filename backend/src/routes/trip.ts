import { Router, Request, Response, NextFunction } from 'express';
import { tripService } from '../services/trip-service';
import { TripInput, MAX_TRIP_LEGS, MAX_FUTURE_DAYS } from '../types/trip';

const router = Router();

// Validate ICAO code format
const validateIcao = (icao: string): boolean => {
  return /^[A-Z]{4}$/i.test(icao);
};

// Validate trip input
const validateTripInput = (
  input: TripInput
): { valid: boolean; error?: string } => {
  if (!input.tripId || typeof input.tripId !== 'string') {
    return { valid: false, error: 'tripId is required' };
  }

  if (!input.legs || !Array.isArray(input.legs)) {
    return { valid: false, error: 'legs array is required' };
  }

  if (input.legs.length === 0) {
    return { valid: false, error: 'At least one leg is required' };
  }

  if (input.legs.length > MAX_TRIP_LEGS) {
    return { valid: false, error: `Maximum ${MAX_TRIP_LEGS} legs allowed` };
  }

  const now = new Date();
  const maxFuture = new Date(now.getTime() + MAX_FUTURE_DAYS * 24 * 60 * 60 * 1000);

  for (let i = 0; i < input.legs.length; i++) {
    const leg = input.legs[i];

    if (!leg.legId) {
      return { valid: false, error: `Leg ${i + 1}: legId is required` };
    }

    if (!leg.departureAirport || !validateIcao(leg.departureAirport)) {
      return {
        valid: false,
        error: `Leg ${i + 1}: Invalid departure airport ICAO code (must be 4 letters)`,
      };
    }

    if (!leg.arrivalAirport || !validateIcao(leg.arrivalAirport)) {
      return {
        valid: false,
        error: `Leg ${i + 1}: Invalid arrival airport ICAO code (must be 4 letters)`,
      };
    }

    if (!leg.departureTime) {
      return { valid: false, error: `Leg ${i + 1}: departureTime is required` };
    }

    const departureTime = new Date(leg.departureTime);
    if (isNaN(departureTime.getTime())) {
      return {
        valid: false,
        error: `Leg ${i + 1}: Invalid departureTime format (use ISO 8601)`,
      };
    }

    if (departureTime > maxFuture) {
      return {
        valid: false,
        error: `Leg ${i + 1}: Departure time cannot be more than ${MAX_FUTURE_DAYS} days ahead`,
      };
    }

    if (
      typeof leg.estimatedFlightMinutes !== 'number' ||
      leg.estimatedFlightMinutes <= 0
    ) {
      return {
        valid: false,
        error: `Leg ${i + 1}: estimatedFlightMinutes must be a positive number`,
      };
    }

    if (leg.estimatedFlightMinutes > 24 * 60) {
      return {
        valid: false,
        error: `Leg ${i + 1}: estimatedFlightMinutes cannot exceed 24 hours`,
      };
    }
  }

  return { valid: true };
};

// POST /api/trip - Get weather for a multi-leg trip
router.post(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = req.body as TripInput;

      // Validate input
      const validation = validateTripInput(input);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid trip input',
          message: validation.error,
        });
      }

      // Get trip weather
      const tripWeather = await tripService.getTripWeather(input);

      res.json(tripWeather);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
