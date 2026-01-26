import { FlightCategory } from '../types/weather';

export const FLIGHT_CATEGORY_STYLES: Record<
  FlightCategory,
  {
    bg: string;
    text: string;
    border: string;
    hex: string;
    label: string;
  }
> = {
  VFR: {
    bg: 'bg-vfr-light',
    text: 'text-vfr-dark',
    border: 'border-vfr',
    hex: '#22c55e',
    label: 'Visual Flight Rules',
  },
  MVFR: {
    bg: 'bg-mvfr-light',
    text: 'text-mvfr-dark',
    border: 'border-mvfr',
    hex: '#3b82f6',
    label: 'Marginal VFR',
  },
  IFR: {
    bg: 'bg-ifr-light',
    text: 'text-ifr-dark',
    border: 'border-ifr',
    hex: '#ef4444',
    label: 'Instrument Flight Rules',
  },
  LIFR: {
    bg: 'bg-lifr-light',
    text: 'text-lifr-dark',
    border: 'border-lifr',
    hex: '#a855f7',
    label: 'Low IFR',
  },
};

export const getFlightCategoryStyle = (category: FlightCategory) => {
  return FLIGHT_CATEGORY_STYLES[category];
};

export const CONFIDENCE_STYLES = {
  high: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    label: 'High Confidence',
  },
  medium: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    label: 'Medium Confidence',
  },
  low: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    label: 'Low Confidence',
  },
};

export const SEVERITY_STYLES = {
  minor: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
  },
  moderate: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
  },
  significant: {
    bg: 'bg-red-100',
    text: 'text-red-800',
  },
};

export const ALERT_SEVERITY_STYLES = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-400',
    text: 'text-blue-800',
    icon: 'text-blue-400',
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-400',
    text: 'text-yellow-800',
    icon: 'text-yellow-400',
  },
  danger: {
    bg: 'bg-red-50',
    border: 'border-red-400',
    text: 'text-red-800',
    icon: 'text-red-400',
  },
};
