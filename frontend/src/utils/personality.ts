import { FlightCategory } from '../types/weather';

export const FRIENDLY_LABELS: Record<FlightCategory, string> = {
  VFR: 'Clear for takeoff!',
  MVFR: 'Reduced visibility',
  IFR: 'Instruments required',
  LIFR: 'Severe low visibility',
};

export const GO_NOGO_FRIENDLY = {
  GO: 'Looking good — weather meets all Part 135 minimums.',
  'NO-GO': 'Hold up — conditions are below Part 135 minimums.',
  CAUTION: 'Marginal conditions — review carefully before dispatch.',
};

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'Burning the midnight oil?';
  if (hour < 12) return 'Good morning, pilot.';
  if (hour < 17) return 'Good afternoon.';
  if (hour < 21) return 'Good evening.';
  return 'Flying late tonight?';
}

export function getSearchEncouragement(): string {
  const phrases = [
    'Where are we flying today?',
    'Enter an ICAO code to get started.',
    'Check the weather at any airport.',
  ];
  return phrases[Math.floor(Math.random() * phrases.length)];
}
