import { useState, FormEvent } from 'react';
import { formatDateTimeDual } from '../utils/formatters';

interface AirportSearchProps {
  onSearch: (icao: string, targetTime: Date | null) => void;
  initialValue?: string;
  initialTime?: Date | null;
}

function AirportSearch({
  onSearch,
  initialValue = '',
  initialTime,
}: AirportSearchProps) {
  // Default to current time if no initial time provided
  const defaultTime = initialTime ?? new Date();

  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    defaultTime.toISOString().split('T')[0]
  );
  const [selectedTime, setSelectedTime] = useState<string>(
    defaultTime.toTimeString().slice(0, 5)
  );

  const validateIcao = (icao: string): boolean => {
    return /^[A-Za-z]{4}$/.test(icao);
  };

  const getTargetTime = (): Date | null => {
    const dateTime = new Date(`${selectedDate}T${selectedTime}`);
    return isNaN(dateTime.getTime()) ? null : dateTime;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim().toUpperCase();

    if (!trimmed) {
      setError('Please enter an airport code');
      return;
    }

    if (!validateIcao(trimmed)) {
      setError('ICAO code must be exactly 4 letters (e.g., KJFK)');
      return;
    }

    const targetTime = getTargetTime();

    // Validate target time is within 7 days
    if (targetTime) {
      const now = new Date();
      const maxFuture = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (targetTime > maxFuture) {
        setError('Target time cannot be more than 7 days ahead');
        return;
      }
    }

    setError(null);
    onSearch(trimmed, targetTime);
  };

  const formatDisplayTime = (): { local: string; utc: string; suffix: string } => {
    const targetTime = getTargetTime();
    if (!targetTime) return { local: '', utc: '', suffix: '' };

    const now = new Date();
    const diffHours = Math.round(
      (targetTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    );

    const { local, utc } = formatDateTimeDual(targetTime);

    let suffix = '';
    if (diffHours === 0) suffix = '(now)';
    else if (diffHours > 0) suffix = `(+${diffHours}h)`;
    else suffix = `(${diffHours}h)`;

    return { local, utc, suffix };
  };

  // Calculate min/max dates for the picker
  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      {/* Main search row */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value.toUpperCase());
            setError(null);
          }}
          placeholder="Enter ICAO code (e.g., KJFK)"
          className={`block w-full pl-12 pr-24 py-4 text-lg font-mono border rounded-lg shadow-sm
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
            ${error ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'}
          `}
          maxLength={4}
          autoComplete="off"
          autoFocus
        />
        <button
          type="submit"
          className="absolute inset-y-0 right-0 px-6 bg-blue-600 text-white font-semibold rounded-r-lg
            hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            transition-colors"
        >
          Search
        </button>
      </div>

      {/* Departure time picker - always visible */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
        <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">Departure:</span>
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-gray-500 dark:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={today}
            max={maxDate}
            className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-gray-500 dark:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <input
            type="time"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>
        <span className="text-sm flex items-center gap-1 flex-wrap">
          <span className="text-gray-700 dark:text-gray-300">{formatDisplayTime().local}</span>
          <span className="text-gray-400">/</span>
          <span className="text-blue-600 dark:text-blue-400 font-mono">{formatDisplayTime().utc}</span>
          <span className="text-gray-500 dark:text-gray-400">{formatDisplayTime().suffix}</span>
        </span>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </form>
  );
}

export default AirportSearch;
