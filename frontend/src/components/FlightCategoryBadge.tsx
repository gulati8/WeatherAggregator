import { FlightCategory } from '../types/weather';
import { FLIGHT_CATEGORY_STYLES } from '../utils/colors';

interface FlightCategoryBadgeProps {
  category: FlightCategory;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showFriendly?: boolean;
}

function FlightCategoryBadge({
  category,
  size = 'md',
  showLabel = false,
  showFriendly = false,
}: FlightCategoryBadgeProps) {
  const style = FLIGHT_CATEGORY_STYLES[category];

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold rounded-full ${style.bg} ${style.text} ${sizeClasses[size]}`}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: style.hex }}
      />
      {category}
      {showLabel && (
        <span className="font-normal text-stone-600 dark:text-stone-400 ml-1">
          ({style.label})
        </span>
      )}
      {showFriendly && !showLabel && (
        <span className="font-normal text-stone-500 dark:text-stone-400 ml-0.5 text-xs">
          {style.friendlyLabel}
        </span>
      )}
    </span>
  );
}

export default FlightCategoryBadge;
