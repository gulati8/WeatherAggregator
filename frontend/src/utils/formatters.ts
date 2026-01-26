// Formatting utilities for weather data display

export const formatTemperature = (
  celsius: number,
  unit: 'C' | 'F' = 'C'
): string => {
  if (unit === 'F') {
    const fahrenheit = (celsius * 9) / 5 + 32;
    return `${Math.round(fahrenheit)}°F`;
  }
  return `${Math.round(celsius)}°C`;
};

export const formatWindSpeed = (knots: number): string => {
  return `${Math.round(knots)} kts`;
};

export const formatWindDirection = (degrees: number | null): string => {
  if (degrees === null) return 'Calm';

  const directions = [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
  ];
  const index = Math.round(degrees / 22.5) % 16;
  return `${degrees.toString().padStart(3, '0')}° (${directions[index]})`;
};

export const formatVisibility = (statuteMiles: number): string => {
  if (statuteMiles >= 10) return '10+ SM';
  if (statuteMiles < 1) {
    // Convert to fractions for low visibility
    if (statuteMiles <= 0.25) return '1/4 SM';
    if (statuteMiles <= 0.5) return '1/2 SM';
    if (statuteMiles <= 0.75) return '3/4 SM';
  }
  return `${statuteMiles.toFixed(1)} SM`;
};

export const formatCeiling = (feet: number | null): string => {
  if (feet === null) return 'Unlimited';
  if (feet >= 10000) return `${Math.round(feet / 1000)}K ft`;
  return `${feet.toLocaleString()} ft`;
};

export const formatPressure = (altimeter: number): string => {
  return `${altimeter.toFixed(2)} inHg`;
};

export const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
};

export const formatDateTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
};

export const formatRelativeTime = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins === 1) return '1 min ago';
  if (diffMins < 60) return `${diffMins} mins ago`;

  const diffHours = Math.round(diffMins / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;

  return formatDateTime(isoString);
};

export const formatCloudCoverage = (coverage: string): string => {
  const coverageNames: Record<string, string> = {
    SKC: 'Sky Clear',
    CLR: 'Clear',
    FEW: 'Few',
    SCT: 'Scattered',
    BKN: 'Broken',
    OVC: 'Overcast',
    VV: 'Vertical Visibility',
  };
  return coverageNames[coverage] || coverage;
};
