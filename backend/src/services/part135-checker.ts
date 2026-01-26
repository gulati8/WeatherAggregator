import {
  CurrentConditions,
  FlightCategory,
  Part135Status,
  MinimumStatus,
  FLIGHT_CATEGORY_THRESHOLDS,
  PART_135_MINIMUMS,
  WeatherPhenomenon,
} from '../types/weather';

class Part135Checker {
  categorize(ceiling: number | null, visibility: number): FlightCategory {
    // LIFR: Ceiling < 500 or Visibility < 1 mile
    if ((ceiling !== null && ceiling < 500) || visibility < 1) {
      return 'LIFR';
    }
    // IFR: Ceiling 500-999 or Visibility 1-3 miles
    if ((ceiling !== null && ceiling < 1000) || visibility < 3) {
      return 'IFR';
    }
    // MVFR: Ceiling 1000-3000 or Visibility 3-5 miles
    if ((ceiling !== null && ceiling < 3000) || visibility < 5) {
      return 'MVFR';
    }
    // VFR: Ceiling >= 3000 (or unlimited) and Visibility >= 5 miles
    return 'VFR';
  }

  checkMinimum(value: number | null, minimum: number): MinimumStatus {
    if (value === null) {
      // Unlimited ceiling
      return {
        value: null,
        minimum,
        margin: Infinity,
        status: 'above',
      };
    }

    const margin = value - minimum;

    return {
      value,
      minimum,
      margin,
      status: margin > 50 ? 'above' : margin >= 0 ? 'at' : 'below',
    };
  }

  identifyHazards(conditions: CurrentConditions): string[] {
    const hazards: string[] = [];

    // Check for convective activity
    if (conditions.weatherPhenomena.some((p) => p.descriptor === 'TS')) {
      hazards.push('Thunderstorms in vicinity');
    }

    // Check for freezing conditions
    if (conditions.weatherPhenomena.some((p) => p.descriptor === 'FZ')) {
      hazards.push('Freezing precipitation');
    }

    // Check for fog
    if (conditions.weatherPhenomena.some((p) => p.type === 'FG')) {
      hazards.push('Fog');
    }

    // Check for heavy precipitation
    if (conditions.weatherPhenomena.some((p) => p.intensity === '+')) {
      hazards.push('Heavy precipitation');
    }

    // Check for low visibility
    if (conditions.visibility.value < 1) {
      hazards.push('Very low visibility');
    }

    // Check for strong winds
    if (conditions.windSpeed.value > 25) {
      hazards.push('Strong surface winds');
    }

    // Check for gusty conditions
    if (conditions.windGust.value && conditions.windGust.value > 35) {
      hazards.push('Strong wind gusts');
    }

    // Check for cumulonimbus clouds
    if (conditions.cloudLayers.some((c) => c.type === 'CB')) {
      hazards.push('Cumulonimbus clouds present');
    }

    return hazards;
  }

  needsAlternate(conditions: CurrentConditions): {
    required: boolean;
    reason?: string;
  } {
    const ceiling = conditions.ceiling.value;
    const visibility = conditions.visibility.value;

    // Check 1-2-3 rule: Need alternate if forecast is below ceiling 2000ft or vis 3mi
    // This is simplified - in practice would check TAF for destination

    if (ceiling !== null && ceiling < 2000) {
      return {
        required: true,
        reason: `Ceiling ${ceiling}ft is below 2000ft alternate requirement`,
      };
    }

    if (visibility < 3) {
      return {
        required: true,
        reason: `Visibility ${visibility}SM is below 3SM alternate requirement`,
      };
    }

    // Check for significant weather
    if (conditions.weatherPhenomena.some((p) => p.descriptor === 'TS')) {
      return {
        required: true,
        reason: 'Thunderstorms forecast',
      };
    }

    return { required: false };
  }

  checkStatus(conditions: CurrentConditions): Part135Status {
    const ceiling = conditions.ceiling.value;
    const visibility = conditions.visibility.value;

    const flightCategory = this.categorize(ceiling, visibility);

    const ceilingStatus = this.checkMinimum(
      ceiling,
      PART_135_MINIMUMS.ceiling.standard
    );

    const visibilityStatus = this.checkMinimum(
      visibility,
      PART_135_MINIMUMS.visibility.standard
    );

    const hazards = this.identifyHazards(conditions);

    const alternateCheck = this.needsAlternate(conditions);

    const canDispatch =
      ceilingStatus.status !== 'below' &&
      visibilityStatus.status !== 'below' &&
      !hazards.includes('Thunderstorms in vicinity');

    return {
      canDispatch,
      flightCategory,
      ceilingStatus,
      visibilityStatus,
      weatherHazards: hazards,
      alternateRequired: alternateCheck.required,
      alternateReason: alternateCheck.reason,
    };
  }
}

export const part135Checker = new Part135Checker();
