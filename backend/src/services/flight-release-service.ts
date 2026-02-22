import crypto from 'crypto';
import { UnifiedWeatherData } from '../types/weather';

export interface FlightRelease {
  releaseId: string;
  generatedAt: string;
  airport: { icao: string; name: string };
  targetTime?: string;
  weatherSummary: {
    flightCategory: string;
    ceiling: string;
    visibility: string;
    wind: string;
    phenomena: string[];
  };
  part135Analysis: {
    canDispatch: boolean;
    ceilingMargin: string;
    visibilityMargin: string;
    alternateRequired: boolean;
    alternateReason?: string;
    regulation: string;
  };
  riskAssessment: {
    score: number;
    level: string;
    factors: string[];
    recommendation: string;
  };
  dataSources: Array<{
    name: string;
    status: string;
    lastUpdated: string;
  }>;
  disclaimer: string;
}

class FlightReleaseService {
  generate(weather: UnifiedWeatherData): FlightRelease {
    const current = weather.current;
    const part135 = weather.part135Status;
    const frat = weather.frat;

    // Format ceiling string
    const ceilingStr =
      current.ceiling.value !== null
        ? `${current.ceiling.value.toLocaleString()} ft AGL`
        : 'Unlimited';

    // Format visibility string
    const visStr =
      current.visibility.value >= 10
        ? '10+ SM'
        : `${current.visibility.value.toFixed(1)} SM`;

    // Format wind string
    const windDir =
      current.isVariableWind
        ? 'VRB'
        : current.windDirection.value !== null
        ? `${String(current.windDirection.value).padStart(3, '0')}°`
        : 'Calm';
    const windSpd = `${Math.round(current.windSpeed.value)} kts`;
    const gustStr =
      current.windGust.value !== null
        ? ` gusting ${Math.round(current.windGust.value)} kts`
        : '';
    const windString = `${windDir} at ${windSpd}${gustStr}`;

    // Weather phenomena descriptions
    const phenomena = current.weatherPhenomena.map((p) => p.description);

    // Ceiling margin
    const ceilingMargin =
      part135.ceilingStatus.value !== null
        ? part135.ceilingStatus.margin > 0
          ? `+${Math.round(part135.ceilingStatus.margin)} ft above minimum`
          : `${Math.round(part135.ceilingStatus.margin)} ft below minimum`
        : 'Unlimited (well above minimum)';

    // Visibility margin
    const visibilityMargin =
      part135.visibilityStatus.margin > 0
        ? `+${part135.visibilityStatus.margin.toFixed(1)} SM above minimum`
        : `${part135.visibilityStatus.margin.toFixed(1)} SM below minimum`;

    // Alternate analysis regulation
    const regulation = part135.alternateAnalysis?.regulation || '14 CFR 135.223(b)';

    // Risk assessment
    const riskAssessment = frat
      ? {
          score: frat.totalScore,
          level: frat.riskLevel,
          factors: frat.factors.map(
            (f) => `[${f.category}] ${f.factor} (+${f.points} pts)`,
          ),
          recommendation: frat.recommendation,
        }
      : {
          score: 0,
          level: 'LOW',
          factors: [],
          recommendation: 'Risk assessment unavailable.',
        };

    // Data sources
    const dataSources = weather.sources.map((s) => ({
      name: s.name,
      status: s.status,
      lastUpdated: s.lastUpdated || weather.timestamp,
    }));

    return {
      releaseId: crypto.randomUUID(),
      generatedAt: new Date().toISOString(),
      airport: {
        icao: weather.airport.icao,
        name: weather.airport.name,
      },
      targetTime: weather.targetTime,
      weatherSummary: {
        flightCategory: part135.flightCategory,
        ceiling: ceilingStr,
        visibility: visStr,
        wind: windString,
        phenomena,
      },
      part135Analysis: {
        canDispatch: part135.canDispatch,
        ceilingMargin,
        visibilityMargin,
        alternateRequired: part135.alternateRequired,
        alternateReason: part135.alternateReason,
        regulation,
      },
      riskAssessment,
      dataSources,
      disclaimer:
        'This flight release document is generated for informational purposes only. ' +
        'It does not replace the judgment of the Pilot in Command (PIC) or qualified dispatcher. ' +
        'All weather data is sourced from public APIs and may not reflect real-time conditions. ' +
        'Verify all information with official aviation weather sources before dispatch.',
    };
  }
}

export const flightReleaseService = new FlightReleaseService();
