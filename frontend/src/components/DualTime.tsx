import { formatDateTimeDual, formatTimeDual } from '../utils/formatters';

interface DualTimeProps {
  time: string | Date;
  showDate?: boolean;
  className?: string;
  layout?: 'inline' | 'stacked';
  size?: 'sm' | 'md' | 'lg';
}

function DualTime({
  time,
  showDate = true,
  className = '',
  layout = 'inline',
  size = 'md',
}: DualTimeProps) {
  const formatted = showDate ? formatDateTimeDual(time) : formatTimeDual(time);

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  if (layout === 'stacked') {
    return (
      <div className={`${sizeClasses[size]} ${className}`}>
        <div className="text-stone-700 dark:text-stone-300 font-medium">
          {showDate ? formatted.local : (formatted as { local: string; utc: string }).local}
        </div>
        <div className="text-teal-600 dark:text-teal-400 font-data">
          {showDate ? formatted.utc : (formatted as { local: string; utc: string }).utc}
        </div>
      </div>
    );
  }

  return (
    <span className={`${sizeClasses[size]} ${className}`}>
      <span className="text-stone-700 dark:text-stone-300">
        {showDate ? formatted.local : (formatted as { local: string; utc: string }).local}
      </span>
      <span className="text-stone-400 dark:text-stone-500 mx-1">/</span>
      <span className="text-teal-600 dark:text-teal-400 font-data">
        {showDate ? formatted.utc : (formatted as { local: string; utc: string }).utc}
      </span>
    </span>
  );
}

export default DualTime;
