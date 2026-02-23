import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useAirportSearch } from '../hooks/useAirportSearch';

interface AirportAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (icao: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
}

export default function AirportAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Airport code or city',
  className = '',
  inputClassName = '',
  autoFocus = false,
}: AirportAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const { results, loading } = useAirportSearch(value, open && value.length >= 1);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlight when results change
  useEffect(() => {
    setHighlightIndex(-1);
  }, [results]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex]);

  const selectAirport = (icao: string) => {
    onChange(icao);
    onSelect?.(icao);
    setOpen(false);
    setHighlightIndex(-1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        if (highlightIndex >= 0 && highlightIndex < results.length) {
          e.preventDefault();
          selectAirport(results[highlightIndex].icao);
        }
        break;
      case 'Escape':
        setOpen(false);
        setHighlightIndex(-1);
        break;
    }
  };

  const showDropdown = open && value.length >= 1 && (results.length > 0 || loading);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value.toUpperCase());
          setOpen(true);
        }}
        onFocus={() => {
          if (value.length >= 1) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={inputClassName}
        autoComplete="off"
        autoFocus={autoFocus}
      />

      {showDropdown && (
        <ul
          ref={listRef}
          className="absolute z-50 left-0 right-0 mt-1 max-h-48 sm:max-h-60 overflow-y-auto bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-lg"
        >
          {loading && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-stone-400 dark:text-stone-500">
              Searching...
            </li>
          )}
          {!loading && results.length === 0 && value.length >= 2 && (
            <li className="px-3 py-2 text-sm text-stone-400 dark:text-stone-500">
              No airports found
            </li>
          )}
          {results.map((airport, i) => (
            <li
              key={airport.icao}
              onMouseDown={(e) => {
                e.preventDefault();
                selectAirport(airport.icao);
              }}
              onMouseEnter={() => setHighlightIndex(i)}
              className={`px-3 py-3 cursor-pointer text-sm flex items-center gap-2 ${
                i === highlightIndex
                  ? 'bg-teal-50 dark:bg-teal-900/30'
                  : 'hover:bg-stone-50 dark:hover:bg-stone-700'
              }`}
            >
              <span className="font-data font-bold text-stone-900 dark:text-stone-100 min-w-[3.5rem]">
                {airport.icao}
              </span>
              {airport.iata && (
                <span className="text-xs text-stone-400 dark:text-stone-500 min-w-[2rem]">
                  {airport.iata}
                </span>
              )}
              <span className="text-stone-600 dark:text-stone-300 truncate">
                {airport.city ? `${airport.name}, ${airport.city}` : airport.name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
