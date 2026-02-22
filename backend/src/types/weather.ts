// Unified weather data structure that normalizes all API responses

export interface AirportInfo {
  icao: string;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  elevation: number; // feet
}

export type WeatherSourceId = 'awc' | 'openmeteo' | 'nws';

export interface WeatherSource {
  id: WeatherSourceId;
  name: string;
  lastUpdated: string;
  status: 'ok' | 'error' | 'stale';
  errorMessage?: string;
}

// Value with data from multiple sources for comparison
export interface SourceValue<T> {
  value: T; // Consensus/primary value
  bySource: Partial<Record<WeatherSourceId, T>>; // Value from each source
  confidence: 'high' | 'medium' | 'low';
  spread?: number; // For numeric values, max-min
}

export interface CloudLayer {
  coverage: 'SKC' | 'CLR' | 'FEW' | 'SCT' | 'BKN' | 'OVC' | 'VV';
  base: number; // Feet AGL
  type?: 'CB' | 'TCU'; // Cumulonimbus or Towering Cumulus
}

export interface WeatherPhenomenon {
  intensity: '-' | '' | '+'; // Light, moderate, heavy
  descriptor?: string;
  type: string; // RA, SN, FG, BR, etc.
  description: string; // Human-readable
}

export type FlightCategory = 'VFR' | 'MVFR' | 'IFR' | 'LIFR';

export interface CurrentConditions {
  observationTime: string;
  rawMetar?: string;
  isVariableWind?: boolean; // True when wind direction is VRB
  temperature: SourceValue<number>; // Celsius
  dewpoint: SourceValue<number>; // Celsius
  humidity: SourceValue<number>; // Percent
  pressure: SourceValue<number>; // hPa/mb
  windDirection: SourceValue<number | null>; // Degrees, null = calm/variable
  windSpeed: SourceValue<number>; // Knots
  windGust: SourceValue<number | null>; // Knots
  visibility: SourceValue<number>; // Statute miles
  ceiling: SourceValue<number | null>; // Feet AGL, null = unlimited
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
  confidenceScore: number; // 0-100
}

export interface MinimumStatus {
  value: number | null;
  minimum: number;
  margin: number; // How much above/below minimum
  status: 'above' | 'at' | 'below';
}

export interface AlternateAnalysis {
  required: boolean;
  reason?: string;
  regulation: string; // e.g., '14 CFR 135.223(b)'
  analysisMethod: 'taf' | 'current' | 'unavailable';
  forecastWindow?: {
    from: string; // ISO 8601
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

export interface WeatherAlert {
  type: 'SIGMET' | 'AIRMET' | 'CONVECTIVE' | 'TFR' | 'NOTAM' | 'WARNING';
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

// Snapshot of conditions at a specific target time
export interface TargetTimeSnapshot {
  targetTime: string;
  conditions: ForecastPeriod;
  isCurrentObservation: boolean; // true if within 1 hour of now
  forecastHoursAhead: number;
  confidence: 'high' | 'medium' | 'low'; // decreases with time
  surroundingPeriods: ForecastPeriod[]; // ±3 hours context
}

export interface UnifiedWeatherData {
  airport: AirportInfo;
  timestamp: string;
  targetTime?: string; // If a specific time was requested
  rawTaf?: string;
  recentMetars?: string[]; // Raw METAR strings from past 3 hours (newest first)
  sources: WeatherSource[];
  current: CurrentConditions;
  forecast: ForecastPeriod[];
  atTargetTime?: TargetTimeSnapshot; // Conditions at the requested time
  consensus: ConsensusAnalysis;
  part135Status: Part135Status;
  frat?: FratResult;
  alerts: WeatherAlert[];
  pireps: PirepReport[];
  airSigmets: AirSigmet[];
}

// Flight Risk Assessment Tool (FRAT) types
export interface FratFactor {
  category: string;       // e.g., 'Weather', 'Airport', 'Time'
  factor: string;         // e.g., 'Low Visibility'
  points: number;         // Risk points (higher = more risk)
  description: string;    // Why this was flagged
}

export interface FratResult {
  totalScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  factors: FratFactor[];
  recommendation: string;
}

// Flight category thresholds
export const FLIGHT_CATEGORY_THRESHOLDS = {
  VFR: { ceiling: 3000, visibility: 5 },
  MVFR: { ceiling: 1000, visibility: 3 },
  IFR: { ceiling: 500, visibility: 1 },
  LIFR: { ceiling: 0, visibility: 0 },
};

// Part 135 minimums
export const PART_135_MINIMUMS = {
  ceiling: {
    standard: 500, // feet AGL
    precision: 200, // CAT I ILS
  },
  visibility: {
    standard: 1.0, // statute miles
    precision: 0.5, // CAT I ILS
  },
};
