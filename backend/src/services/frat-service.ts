import {
  CurrentConditions,
  ConsensusAnalysis,
  FratFactor,
  FratResult,
} from '../types/weather';

class FratService {
  /**
   * Assess flight risk based on weather conditions, source consensus,
   * and time-based factors. Returns a scored risk assessment.
   */
  assess(
    conditions: CurrentConditions,
    consensus: ConsensusAnalysis,
    targetTime?: Date,
  ): FratResult {
    const factors: FratFactor[] = [];

    // Evaluate weather factors
    this.assessWeatherFactors(conditions, factors);

    // Evaluate source agreement
    this.assessSourceAgreement(consensus, factors);

    // Evaluate time factors
    this.assessTimeFactors(targetTime, factors);

    const totalScore = factors.reduce((sum, f) => sum + f.points, 0);
    const riskLevel = this.determineRiskLevel(totalScore);
    const recommendation = this.getRecommendation(riskLevel);

    return {
      totalScore,
      riskLevel,
      factors,
      recommendation,
    };
  }

  private assessWeatherFactors(
    conditions: CurrentConditions,
    factors: FratFactor[],
  ): void {
    const category = conditions.flightCategory.value;

    // Flight category scoring
    if (category === 'LIFR') {
      factors.push({
        category: 'Weather',
        factor: 'LIFR Conditions',
        points: 15,
        description:
          'Low Instrument Flight Rules: ceiling below 500 ft or visibility below 1 SM',
      });
    } else if (category === 'IFR') {
      factors.push({
        category: 'Weather',
        factor: 'IFR Conditions',
        points: 10,
        description:
          'Instrument Flight Rules: ceiling 500-999 ft or visibility 1-3 SM',
      });
    } else if (category === 'MVFR') {
      factors.push({
        category: 'Weather',
        factor: 'MVFR Conditions',
        points: 5,
        description:
          'Marginal VFR: ceiling 1000-3000 ft or visibility 3-5 SM',
      });
    }

    // Thunderstorms
    if (conditions.weatherPhenomena.some((p) => p.descriptor === 'TS')) {
      factors.push({
        category: 'Weather',
        factor: 'Thunderstorms',
        points: 20,
        description: 'Thunderstorm activity reported or in vicinity',
      });
    }

    // Freezing precipitation
    if (conditions.weatherPhenomena.some((p) => p.descriptor === 'FZ')) {
      factors.push({
        category: 'Weather',
        factor: 'Freezing Precipitation',
        points: 15,
        description: 'Freezing rain, drizzle, or fog reported',
      });
    }

    // Low visibility < 1 SM
    if (conditions.visibility.value < 1) {
      factors.push({
        category: 'Weather',
        factor: 'Low Visibility',
        points: 10,
        description: `Visibility ${conditions.visibility.value.toFixed(1)} SM is below 1 SM`,
      });
    }

    // Strong winds > 25 kts
    if (conditions.windSpeed.value > 25) {
      factors.push({
        category: 'Weather',
        factor: 'Strong Winds',
        points: 8,
        description: `Surface winds ${Math.round(conditions.windSpeed.value)} kts exceed 25 kts`,
      });
    }

    // Wind gusts > 35 kts
    if (
      conditions.windGust.value !== null &&
      conditions.windGust.value > 35
    ) {
      factors.push({
        category: 'Weather',
        factor: 'Strong Gusts',
        points: 10,
        description: `Wind gusts ${Math.round(conditions.windGust.value)} kts exceed 35 kts`,
      });
    }

    // CB clouds
    if (conditions.cloudLayers.some((c) => c.type === 'CB')) {
      factors.push({
        category: 'Weather',
        factor: 'Cumulonimbus Clouds',
        points: 12,
        description: 'Cumulonimbus clouds present indicating convective activity',
      });
    }

    // Fog
    if (conditions.weatherPhenomena.some((p) => p.type === 'FG')) {
      factors.push({
        category: 'Weather',
        factor: 'Fog',
        points: 8,
        description: 'Fog reported at the airport',
      });
    }
  }

  private assessSourceAgreement(
    consensus: ConsensusAnalysis,
    factors: FratFactor[],
  ): void {
    if (consensus.overallAgreement === 'weak') {
      factors.push({
        category: 'Source Agreement',
        factor: 'Weak Consensus',
        points: 10,
        description:
          'Weather sources show significant disagreement, increasing forecast uncertainty',
      });
    } else if (consensus.overallAgreement === 'moderate') {
      factors.push({
        category: 'Source Agreement',
        factor: 'Moderate Consensus',
        points: 5,
        description:
          'Weather sources show some disagreement on conditions',
      });
    }
  }

  private assessTimeFactors(
    targetTime: Date | undefined,
    factors: FratFactor[],
  ): void {
    const now = new Date();

    // Night operation check (approximate 6pm-6am local)
    const checkTime = targetTime || now;
    const hours = checkTime.getHours();
    if (hours >= 18 || hours < 6) {
      factors.push({
        category: 'Time',
        factor: 'Night Operation',
        points: 5,
        description: 'Operation during nighttime hours (approx. 6 PM - 6 AM local)',
      });
    }

    // Forecast lead time
    if (targetTime) {
      const hoursAhead =
        (targetTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursAhead > 24) {
        factors.push({
          category: 'Time',
          factor: 'Long-Range Forecast',
          points: 10,
          description: `Target time is ${Math.round(hoursAhead)} hours ahead; forecast accuracy decreases significantly beyond 24 hours`,
        });
      } else if (hoursAhead > 12) {
        factors.push({
          category: 'Time',
          factor: 'Extended Forecast',
          points: 5,
          description: `Target time is ${Math.round(hoursAhead)} hours ahead; forecast accuracy decreases beyond 12 hours`,
        });
      }
    }
  }

  private determineRiskLevel(
    totalScore: number,
  ): FratResult['riskLevel'] {
    if (totalScore >= 41) return 'CRITICAL';
    if (totalScore >= 26) return 'HIGH';
    if (totalScore >= 11) return 'MODERATE';
    return 'LOW';
  }

  private getRecommendation(
    riskLevel: FratResult['riskLevel'],
  ): string {
    switch (riskLevel) {
      case 'LOW':
        return 'Standard operations. Normal dispatch procedures apply.';
      case 'MODERATE':
        return 'Elevated risk. Review conditions carefully and brief crew on hazards.';
      case 'HIGH':
        return 'High risk. Consider delay or cancellation. Require PIC and dispatch agreement.';
      case 'CRITICAL':
        return 'Flight not recommended. Multiple significant risk factors present.';
    }
  }
}

export const fratService = new FratService();
