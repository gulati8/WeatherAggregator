// Trip planning types for multi-leg flight itineraries

import { UnifiedWeatherData, Part135Status, FlightCategory } from './weather';

// Input types for trip requests

export interface TripLegInput {
  legId: string;
  departureAirport: string;      // ICAO code
  arrivalAirport: string;        // ICAO code
  departureTime: string;         // ISO 8601
  estimatedFlightMinutes: number;
}

export interface TripInput {
  tripId: string;
  name?: string;
  legs: TripLegInput[];
}

// Response types

export interface TripLegIssue {
  type: 'departure' | 'arrival' | 'enroute';
  severity: 'warning' | 'caution' | 'info';
  airport?: string;
  description: string;
  time: string;
}

export interface TripLegStatus {
  canDispatch: boolean;
  departureStatus: Part135Status;
  arrivalStatus: Part135Status;
  issues: TripLegIssue[];
}

export interface TripLegWeather {
  legId: string;
  departureAirport: {
    icao: string;
    weather: UnifiedWeatherData;
  };
  arrivalAirport: {
    icao: string;
    weather: UnifiedWeatherData;
  };
  departureTime: string;
  arrivalTime: string;
  estimatedFlightMinutes: number;
  legStatus: TripLegStatus;
}

export interface TripSummary {
  totalLegs: number;
  goLegs: number;
  noGoLegs: number;
  cautionLegs: number;
  overallStatus: 'GO' | 'NO-GO' | 'CAUTION';
  overallConfidence: 'high' | 'medium' | 'low';
  worstFlightCategory: FlightCategory;
  worstLegIndex: number;
  criticalIssues: TripLegIssue[];
  multiSourceAgreement: 'strong' | 'moderate' | 'weak';
}

export interface TripWeatherResponse {
  tripId: string;
  name?: string;
  timestamp: string;
  legs: TripLegWeather[];
  summary: TripSummary;
}

// Constants

export const MAX_TRIP_LEGS = 10;
export const MAX_FUTURE_DAYS = 7;
