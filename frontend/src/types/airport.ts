export interface AirportRecord {
  icao: string;
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  type: 'large_airport' | 'medium_airport';
}
