import { useState, FormEvent } from 'react';

interface AirportSearchProps {
  onSearch: (icao: string) => void;
  initialValue?: string;
}

function AirportSearch({ onSearch, initialValue = '' }: AirportSearchProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  const validateIcao = (icao: string): boolean => {
    return /^[A-Za-z]{4}$/.test(icao);
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

    setError(null);
    onSearch(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
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
            ${error ? 'border-red-300' : 'border-gray-300'}
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
      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
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
