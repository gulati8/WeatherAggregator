import {
  CurrentConditions,
  FlightCategory,
  Part135Status,
  MinimumStatus,
  AlternateAnalysis,
  PART_135_MINIMUMS,
  WeatherPhenomenon,
  ForecastPeriod,
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

  /**
   * Analyze alternate requirement per 14 CFR 135.223(b).
   *
   * An alternate is NOT required when ALL of the following are met for the
   * period from 1 hour before to 1 hour after ETA:
   *   - A standard instrument approach exists at the destination
   *   - Ceiling >= 1,500 ft above lowest circling MDA
   *     (simplified: we use 2,000 ft above airport elevation as a proxy
   *      since we don't have MDA data)
   *   - Visibility >= 3 SM (or >= 2 SM above lowest applicable minimums,
   *     whichever is greater)
   *
   * This method checks TAF forecast periods that overlap the ETA ±1 hour
   * window. If no TAF is available, it falls back to current conditions.
   */
  analyzeAlternate(
    conditions: CurrentConditions,
    forecast: ForecastPeriod[],
    eta?: Date,
  ): AlternateAnalysis {
    // If we have TAF periods and an ETA, analyze the forecast window
    if (eta && forecast.length > 0) {
      return this.analyzeAlternateFromTaf(forecast, eta);
    }

    // Fallback: use current conditions
    return this.analyzeAlternateFromCurrent(conditions);
  }

  private analyzeAlternateFromTaf(
    forecast: ForecastPeriod[],
    eta: Date,
  ): AlternateAnalysis {
    const windowStart = new Date(eta.getTime() - 60 * 60 * 1000); // ETA - 1hr
    const windowEnd = new Date(eta.getTime() + 60 * 60 * 1000);   // ETA + 1hr

    // Find forecast periods that overlap our window
    const relevantPeriods = forecast.filter((p) => {
      const from = new Date(p.validFrom);
      const to = new Date(p.validTo);
      return from < windowEnd && to > windowStart;
    });

    if (relevantPeriods.length === 0) {
      return {
        required: true,
        reason: 'No TAF forecast available for ETA ±1 hour window',
        regulation: '14 CFR 135.223(b)',
        analysisMethod: 'unavailable',
      };
    }

    // Check worst conditions across all periods in the window
    // Per 135.223(b), conditions must be met for the ENTIRE window
    let worstCeiling: number | null = null; // null = unlimited (best)
    let worstVisibility = Infinity;
    let hasThunderstorms = false;

    for (const period of relevantPeriods) {
      const ceiling = period.ceiling.value;
      const visibility = period.visibility.value;

      // Track worst ceiling (lowest value; null means unlimited)
      if (ceiling !== null) {
        if (worstCeiling === null || ceiling < worstCeiling) {
          worstCeiling = ceiling;
        }
      }

      // Track worst visibility
      if (visibility < worstVisibility) {
        worstVisibility = visibility;
      }

      // Check for thunderstorms
      if (period.weatherPhenomena.some((p) => p.descriptor === 'TS')) {
        hasThunderstorms = true;
      }
    }

    const forecastWindow = {
      from: windowStart.toISOString(),
      to: windowEnd.toISOString(),
      worstCeiling,
      worstVisibility,
    };

    // 135.223(b): Ceiling must be >= 1,500 ft above lowest circling MDA.
    // Since we don't have MDA data, use 2,000 ft as conservative proxy.
    const ceilingThreshold = 2000;
    // Visibility must be >= 3 SM
    const visibilityThreshold = 3;

    const reasons: string[] = [];

    if (worstCeiling !== null && worstCeiling < ceilingThreshold) {
      reasons.push(
        `TAF forecast ceiling ${worstCeiling}ft within ETA ±1hr window is below ${ceilingThreshold}ft threshold`
      );
    }

    if (worstVisibility < visibilityThreshold) {
      reasons.push(
        `TAF forecast visibility ${worstVisibility.toFixed(1)}SM within ETA ±1hr window is below ${visibilityThreshold}SM threshold`
      );
    }

    if (hasThunderstorms) {
      reasons.push('Thunderstorms forecast within ETA ±1hr window');
    }

    if (reasons.length > 0) {
      return {
        required: true,
        reason: reasons.join('; '),
        regulation: '14 CFR 135.223(b)',
        analysisMethod: 'taf',
        forecastWindow,
      };
    }

    return {
      required: false,
      regulation: '14 CFR 135.223(b)',
      analysisMethod: 'taf',
      forecastWindow,
    };
  }

  private analyzeAlternateFromCurrent(
    conditions: CurrentConditions,
  ): AlternateAnalysis {
    const ceiling = conditions.ceiling.value;
    const visibility = conditions.visibility.value;

    const reasons: string[] = [];

    if (ceiling !== null && ceiling < 2000) {
      reasons.push(
        `Current ceiling ${ceiling}ft is below 2000ft alternate threshold`
      );
    }

    if (visibility < 3) {
      reasons.push(
        `Current visibility ${visibility}SM is below 3SM alternate threshold`
      );
    }

    if (conditions.weatherPhenomena.some((p) => p.descriptor === 'TS')) {
      reasons.push('Thunderstorms reported');
    }

    return {
      required: reasons.length > 0,
      reason: reasons.length > 0 ? reasons.join('; ') : undefined,
      regulation: '14 CFR 135.223(b)',
      analysisMethod: 'current',
    };
  }

  /**
   * Legacy method for backward compatibility.
   * Prefer analyzeAlternate() which uses TAF data.
   */
  needsAlternate(
    conditions: CurrentConditions,
    forecast?: ForecastPeriod[],
    eta?: Date,
  ): { required: boolean; reason?: string } {
    const analysis = this.analyzeAlternate(conditions, forecast || [], eta);
    return { required: analysis.required, reason: analysis.reason };
  }

  checkStatus(
    conditions: CurrentConditions,
    forecast?: ForecastPeriod[],
    eta?: Date,
  ): Part135Status {
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

    const alternateAnalysis = this.analyzeAlternate(
      conditions,
      forecast || [],
      eta,
    );

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
      alternateRequired: alternateAnalysis.required,
      alternateReason: alternateAnalysis.reason,
      alternateAnalysis,
    };
  }
}

export const part135Checker = new Part135Checker();
