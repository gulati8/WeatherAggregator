// Unified weather data types (mirrored from backend)

export interface AirportInfo {
  icao: string;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  elevation: number;
}

export type WeatherSourceId = 'awc' | 'openmeteo' | 'nws';

export interface WeatherSource {
  id: WeatherSourceId;
  name: string;
  lastUpdated: string;
  status: 'ok' | 'error' | 'stale';
  errorMessage?: string;
}

export interface SourceValue<T> {
  value: T;
  bySource: Partial<Record<WeatherSourceId, T>>;
  confidence: 'high' | 'medium' | 'low';
  spread?: number;
}

export interface CloudLayer {
  coverage: 'SKC' | 'CLR' | 'FEW' | 'SCT' | 'BKN' | 'OVC' | 'VV';
  base: number;
  type?: 'CB' | 'TCU';
}

export interface WeatherPhenomenon {
  intensity: '-' | '' | '+';
  descriptor?: string;
  type: string;
  description: string;
}

export type FlightCategory = 'VFR' | 'MVFR' | 'IFR' | 'LIFR';

export interface CurrentConditions {
  observationTime: string;
  rawMetar?: string;
  isVariableWind?: boolean;
  temperature: SourceValue<number>;
  dewpoint: SourceValue<number>;
  humidity: SourceValue<number>;
  pressure: SourceValue<number>;
  windDirection: SourceValue<number | null>;
  windSpeed: SourceValue<number>;
  windGust: SourceValue<number | null>;
  visibility: SourceValue<number>;
  ceiling: SourceValue<number | null>;
  cloudLayers: CloudLayer[];
  weatherPhenomena: WeatherPhenomenon[];
  flightCategory: SourceValue<FlightCategory>;
}

export interface ForecastPeriod {
  validFrom: string;
  validTo: string;
  type: 'FM' | 'TEMPO' | 'BECMG' | 'PROB' | 'BASE';
  probability?: number;
  isVariableWind?: boolean;
  temperature: SourceValue<number>;
  windDirection: SourceValue<number | null>;
  windSpeed: SourceValue<number>;
  windGust: SourceValue<number | null>;
  visibility: SourceValue<number>;
  ceiling: SourceValue<number | null>;
  precipitationProbability: SourceValue<number>;
  cloudLayers: CloudLayer[];
  weatherPhenomena: WeatherPhenomenon[];
  flightCategory: SourceValue<FlightCategory>;
}

export interface DisagreementItem {
  parameter: string;
  description: string;
  severity: 'minor' | 'moderate' | 'significant';
  sourceValues: Record<string, string>;
}

export interface ConsensusAnalysis {
  overallAgreement: 'strong' | 'moderate' | 'weak';
  disagreementAreas: DisagreementItem[];
  confidenceScore: number;
}

export interface MinimumStatus {
  value: number | null;
  minimum: number;
  margin: number;
  status: 'above' | 'at' | 'below';
}

export interface AlternateAnalysis {
  required: boolean;
  reason?: string;
  regulation: string;
  analysisMethod: 'taf' | 'current' | 'unavailable';
  forecastWindow?: {
    from: string;
    to: string;
    worstCeiling: number | null;
    worstVisibility: number;
  };
}

export interface Part135Status {
  canDispatch: boolean;
  flightCategory: FlightCategory;
  ceilingStatus: MinimumStatus;
  visibilityStatus: MinimumStatus;
  weatherHazards: string[];
  alternateRequired: boolean;
  alternateReason?: string;
  alternateAnalysis?: AlternateAnalysis;
}

export interface FratFactor {
  category: string;
  factor: string;
  points: number;
  description: string;
}

export interface FratResult {
  totalScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  factors: FratFactor[];
  recommendation: string;
}

export interface WeatherAlert {
  type: 'SIGMET' | 'AIRMET' | 'CONVECTIVE' | 'TFR' | 'NOTAM' | 'WARNING' | 'PIREP';
  severity: 'info' | 'warning' | 'danger';
  title: string;
  description: string;
  validFrom: string;
  validTo: string;
  area?: string;
}

export interface PirepReport {
  id: number;
  reportTime: string;
  location: { lat: number; lon: number };
  altitude: number; // feet
  aircraftType: string;
  rawReport: string;
  turbulence?: {
    intensity: string; // NEG, LGT, MOD, SEV, EXTRM
    minAlt: number | null;
    maxAlt: number | null;
  };
  icing?: {
    intensity: string;
    minAlt: number | null;
    maxAlt: number | null;
  };
  weatherString?: string;
}

export interface AirSigmet {
  id: number;
  type: 'SIGMET' | 'AIRMET' | 'CONVECTIVE_SIGMET';
  hazard: string;
  severity: string;
  validFrom: string;
  validTo: string;
  altitudeLow: number | null;
  altitudeHigh: number | null;
  rawText: string;
  coordinates: Array<{ lat: number; lon: number }>;
}

export interface TargetTimeSnapshot {
  targetTime: string;
  conditions: ForecastPeriod;
  isCurrentObservation: boolean;
  forecastHoursAhead: number;
  confidence: 'high' | 'medium' | 'low';
  surroundingPeriods: ForecastPeriod[];
}

export interface UnifiedWeatherData {
  airport: AirportInfo;
  timestamp: string;
  targetTime?: string;
  rawTaf?: string;
  recentMetars?: string[];
  sources: WeatherSource[];
  current: CurrentConditions;
  forecast: ForecastPeriod[];
  atTargetTime?: TargetTimeSnapshot;
  consensus: ConsensusAnalysis;
  part135Status: Part135Status;
  frat?: FratResult;
  alerts: WeatherAlert[];
  pireps: PirepReport[];
  airSigmets: AirSigmet[];
}
