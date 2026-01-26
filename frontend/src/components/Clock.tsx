import { useState, useEffect } from 'react';

interface ClockProps {
  className?: string;
  compact?: boolean;
}

function Clock({ className = '', compact = false }: ClockProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatLocalTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: compact ? undefined : '2-digit',
      hour12: false,
    });
  };

  const formatUtcTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: compact ? undefined : '2-digit',
      hour12: false,
      timeZone: 'UTC',
    });
  };

  const getLocalTimezone = (): string => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
      .split('/')
      .pop()
      ?.replace('_', ' ') || 'Local';
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 text-xs font-mono ${className}`}>
        <span className="text-gray-600">{formatLocalTime(time)}</span>
        <span className="text-gray-400">/</span>
        <span className="text-blue-600">{formatUtcTime(time)}Z</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs ${className}`}>
      <div className="flex items-center gap-1">
        <span className="text-gray-500">{getLocalTimezone()}:</span>
        <span className="font-mono font-medium text-gray-700">{formatLocalTime(time)}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-gray-500">UTC:</span>
        <span className="font-mono font-medium text-blue-600">{formatUtcTime(time)}Z</span>
      </div>
    </div>
  );
}

export default Clock;
