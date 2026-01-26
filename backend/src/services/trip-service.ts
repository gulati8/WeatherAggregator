// Trip planning service for multi-leg flight itineraries

import {
  TripInput,
  TripLegInput,
  TripWeatherResponse,
  TripLegWeather,
  TripLegIssue,
  TripSummary,
  TripLegStatus,
} from '../types/trip';
import { UnifiedWeatherData, FlightCategory, Part135Status } from '../types/weather';
import { weatherAggregator } from './weather-aggregator';

// Flight category severity ranking (lower is worse)
const FLIGHT_CATEGORY_RANK: Record<FlightCategory, number> = {
  LIFR: 0,
  IFR: 1,
  MVFR: 2,
  VFR: 3,
};

interface AirportTimeKey {
  icao: string;
  time: Date;
}

class TripService {
  /**
   * Get weather for all legs of a trip
   * Fetches all required airport+time combinations in parallel
   */
  async getTripWeather(input: TripInput): Promise<TripWeatherResponse> {
    // Collect unique airport+time combinations needed
    const weatherRequests = this.collectWeatherRequests(input.legs);

    // Fetch all weather data in parallel
    const weatherResults = await this.fetchWeatherParallel(weatherRequests);

    // Build leg weather with status analysis
    const legs = this.buildTripLegs(input.legs, weatherResults);

    // Analyze overall trip summary
    const summary = this.buildTripSummary(legs);

    return {
      tripId: input.tripId,
      name: input.name,
      timestamp: new Date().toISOString(),
      legs,
      summary,
    };
  }

  /**
   * Collect all unique airport+time combinations needed for the trip
   */
  private collectWeatherRequests(legs: TripLegInput[]): AirportTimeKey[] {
    const requests: AirportTimeKey[] = [];
    const seen = new Set<string>();

    for (const leg of legs) {
      const departureTime = new Date(leg.departureTime);
      const arrivalTime = new Date(
        departureTime.getTime() + leg.estimatedFlightMinutes * 60 * 1000
      );

      // Departure airport at departure time
      const depKey = `${leg.departureAirport}:${departureTime.toISOString()}`;
      if (!seen.has(depKey)) {
        seen.add(depKey);
        requests.push({ icao: leg.departureAirport, time: departureTime });
      }

      // Arrival airport at arrival time
      const arrKey = `${leg.arrivalAirport}:${arrivalTime.toISOString()}`;
      if (!seen.has(arrKey)) {
        seen.add(arrKey);
        requests.push({ icao: leg.arrivalAirport, time: arrivalTime });
      }
    }

    return requests;
  }

  /**
   * Fetch weather for all airport+time combinations in parallel
   */
  private async fetchWeatherParallel(
    requests: AirportTimeKey[]
  ): Promise<Map<string, UnifiedWeatherData>> {
    const results = new Map<string, UnifiedWeatherData>();

    const promises = requests.map(async ({ icao, time }) => {
      const key = `${icao.toUpperCase()}:${time.toISOString()}`;
      try {
        const weather = await weatherAggregator.getAggregatedWeather(icao, time);
        return { key, weather, error: null };
      } catch (error) {
        console.error(`Failed to fetch weather for ${icao} at ${time}:`, error);
        return { key, weather: null, error };
      }
    });

    const settled = await Promise.allSettled(promises);

    for (const result of settled) {
      if (result.status === 'fulfilled' && result.value.weather) {
        results.set(result.value.key, result.value.weather);
      }
    }

    return results;
  }

  /**
   * Build trip leg weather data with Part 135 status analysis
   */
  private buildTripLegs(
    legs: TripLegInput[],
    weatherResults: Map<string, UnifiedWeatherData>
  ): TripLegWeather[] {
    return legs.map((leg) => {
      const departureTime = new Date(leg.departureTime);
      const arrivalTime = new Date(
        departureTime.getTime() + leg.estimatedFlightMinutes * 60 * 1000
      );

      const depKey = `${leg.departureAirport.toUpperCase()}:${departureTime.toISOString()}`;
      const arrKey = `${leg.arrivalAirport.toUpperCase()}:${arrivalTime.toISOString()}`;

      const departureWeather = weatherResults.get(depKey);
      const arrivalWeather = weatherResults.get(arrKey);

      // Build leg status
      const legStatus = this.buildLegStatus(
        leg,
        departureWeather,
        arrivalWeather,
        departureTime,
        arrivalTime
      );

      return {
        legId: leg.legId,
        departureAirport: {
          icao: leg.departureAirport.toUpperCase(),
          weather: departureWeather!,
        },
        arrivalAirport: {
          icao: leg.arrivalAirport.toUpperCase(),
          weather: arrivalWeather!,
        },
        departureTime: departureTime.toISOString(),
        arrivalTime: arrivalTime.toISOString(),
        estimatedFlightMinutes: leg.estimatedFlightMinutes,
        legStatus,
      };
    });
  }

  /**
   * Build Part 135 status for a single leg
   */
  private buildLegStatus(
    leg: TripLegInput,
    departureWeather: UnifiedWeatherData | undefined,
    arrivalWeather: UnifiedWeatherData | undefined,
    departureTime: Date,
    arrivalTime: Date
  ): TripLegStatus {
    const issues: TripLegIssue[] = [];

    // Default statuses if weather data is missing
    const defaultStatus: Part135Status = {
      canDispatch: false,
      flightCategory: 'LIFR',
      ceilingStatus: { value: null, minimum: 500, margin: 0, status: 'below' },
      visibilityStatus: { value: 0, minimum: 1, margin: 0, status: 'below' },
      weatherHazards: [],
      alternateRequired: true,
      alternateReason: 'Weather data unavailable',
    };

    // Get Part 135 status from weather data
    const departureStatus = departureWeather?.part135Status || defaultStatus;
    const arrivalStatus = arrivalWeather?.part135Status || defaultStatus;

    // Check for missing weather data
    if (!departureWeather) {
      issues.push({
        type: 'departure',
        severity: 'warning',
        airport: leg.departureAirport,
        description: `Weather data unavailable for ${leg.departureAirport}`,
        time: departureTime.toISOString(),
      });
    }

    if (!arrivalWeather) {
      issues.push({
        type: 'arrival',
        severity: 'warning',
        airport: leg.arrivalAirport,
        description: `Weather data unavailable for ${leg.arrivalAirport}`,
        time: arrivalTime.toISOString(),
      });
    }

    // Check departure conditions
    if (departureWeather) {
      if (!departureStatus.canDispatch) {
        issues.push({
          type: 'departure',
          severity: 'warning',
          airport: leg.departureAirport,
          description: `${leg.departureAirport} below Part 135 minimums at departure`,
          time: departureTime.toISOString(),
        });
      } else if (
        departureStatus.flightCategory === 'MVFR' ||
        departureStatus.flightCategory === 'IFR'
      ) {
        issues.push({
          type: 'departure',
          severity: 'caution',
          airport: leg.departureAirport,
          description: `${leg.departureAirport} ${departureStatus.flightCategory} conditions at departure`,
          time: departureTime.toISOString(),
        });
      }

      // Add hazard warnings
      for (const hazard of departureStatus.weatherHazards) {
        issues.push({
          type: 'departure',
          severity: hazard.includes('Thunderstorm') ? 'warning' : 'caution',
          airport: leg.departureAirport,
          description: `${leg.departureAirport}: ${hazard}`,
          time: departureTime.toISOString(),
        });
      }
    }

    // Check arrival conditions
    if (arrivalWeather) {
      if (!arrivalStatus.canDispatch) {
        issues.push({
          type: 'arrival',
          severity: 'warning',
          airport: leg.arrivalAirport,
          description: `${leg.arrivalAirport} forecast below Part 135 minimums at arrival`,
          time: arrivalTime.toISOString(),
        });
      } else if (
        arrivalStatus.flightCategory === 'MVFR' ||
        arrivalStatus.flightCategory === 'IFR'
      ) {
        issues.push({
          type: 'arrival',
          severity: 'caution',
          airport: leg.arrivalAirport,
          description: `${leg.arrivalAirport} ${arrivalStatus.flightCategory} conditions forecast at arrival`,
          time: arrivalTime.toISOString(),
        });
      }

      // Add hazard warnings
      for (const hazard of arrivalStatus.weatherHazards) {
        issues.push({
          type: 'arrival',
          severity: hazard.includes('Thunderstorm') ? 'warning' : 'caution',
          airport: leg.arrivalAirport,
          description: `${leg.arrivalAirport}: ${hazard}`,
          time: arrivalTime.toISOString(),
        });
      }

      // Alternate requirement warning
      if (arrivalStatus.alternateRequired) {
        issues.push({
          type: 'arrival',
          severity: 'info',
          airport: leg.arrivalAirport,
          description: `Alternate required: ${arrivalStatus.alternateReason}`,
          time: arrivalTime.toISOString(),
        });
      }
    }

    // Determine if leg can dispatch
    const canDispatch = departureStatus.canDispatch && arrivalStatus.canDispatch;

    return {
      canDispatch,
      departureStatus,
      arrivalStatus,
      issues,
    };
  }

  /**
   * Build overall trip summary
   */
  private buildTripSummary(legs: TripLegWeather[]): TripSummary {
    let goLegs = 0;
    let noGoLegs = 0;
    let cautionLegs = 0;
    let worstCategory: FlightCategory = 'VFR';
    let worstLegIndex = 0;
    const criticalIssues: TripLegIssue[] = [];
    let weakestAgreement: 'strong' | 'moderate' | 'weak' = 'strong';

    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];

      // Count leg status
      if (leg.legStatus.canDispatch) {
        const hasWarnings = leg.legStatus.issues.some((issue) => issue.severity === 'warning');
        const hasCautions = leg.legStatus.issues.some((issue) => issue.severity === 'caution');

        if (hasWarnings) {
          cautionLegs++;
        } else if (hasCautions) {
          cautionLegs++;
        } else {
          goLegs++;
        }
      } else {
        noGoLegs++;
      }

      // Track worst flight category
      const depCategory = leg.legStatus.departureStatus.flightCategory;
      const arrCategory = leg.legStatus.arrivalStatus.flightCategory;
      const legWorst =
        FLIGHT_CATEGORY_RANK[depCategory] < FLIGHT_CATEGORY_RANK[arrCategory]
          ? depCategory
          : arrCategory;

      if (FLIGHT_CATEGORY_RANK[legWorst] < FLIGHT_CATEGORY_RANK[worstCategory]) {
        worstCategory = legWorst;
        worstLegIndex = i;
      }

      // Collect critical (warning) issues
      for (const issue of leg.legStatus.issues) {
        if (issue.severity === 'warning') {
          criticalIssues.push(issue);
        }
      }

      // Track multi-source agreement
      const depAgreement = leg.departureAirport.weather?.consensus?.overallAgreement;
      const arrAgreement = leg.arrivalAirport.weather?.consensus?.overallAgreement;

      if (depAgreement === 'weak' || arrAgreement === 'weak') {
        weakestAgreement = 'weak';
      } else if (
        (depAgreement === 'moderate' || arrAgreement === 'moderate') &&
        weakestAgreement !== 'weak'
      ) {
        weakestAgreement = 'moderate';
      }
    }

    // Determine overall status
    let overallStatus: 'GO' | 'NO-GO' | 'CAUTION';
    if (noGoLegs > 0) {
      overallStatus = 'NO-GO';
    } else if (cautionLegs > 0) {
      overallStatus = 'CAUTION';
    } else {
      overallStatus = 'GO';
    }

    // Determine overall confidence
    let overallConfidence: 'high' | 'medium' | 'low';
    if (weakestAgreement === 'weak' || noGoLegs > 0) {
      overallConfidence = 'low';
    } else if (weakestAgreement === 'moderate' || cautionLegs > 0) {
      overallConfidence = 'medium';
    } else {
      overallConfidence = 'high';
    }

    return {
      totalLegs: legs.length,
      goLegs,
      noGoLegs,
      cautionLegs,
      overallStatus,
      overallConfidence,
      worstFlightCategory: worstCategory,
      worstLegIndex,
      criticalIssues,
      multiSourceAgreement: weakestAgreement,
    };
  }
}

export const tripService = new TripService();
