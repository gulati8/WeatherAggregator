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

export type WeatherSourceId = 'awc' | 'avwx' | 'openmeteo' | 'nws';

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

export interface Part135Status {
  canDispatch: boolean;
  flightCategory: FlightCategory;
  ceilingStatus: MinimumStatus;
  visibilityStatus: MinimumStatus;
  weatherHazards: string[];
  alternateRequired: boolean;
  alternateReason?: string;
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

export interface UnifiedWeatherData {
  airport: AirportInfo;
  timestamp: string;
  sources: WeatherSource[];
  current: CurrentConditions;
  forecast: ForecastPeriod[];
  consensus: ConsensusAnalysis;
  part135Status: Part135Status;
  alerts: WeatherAlert[];
}
