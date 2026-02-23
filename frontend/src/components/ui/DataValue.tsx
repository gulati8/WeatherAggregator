interface DataValueProps {
  label: string;
  value: string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  sub?: string;
  className?: string;
}

const trendIcons = {
  up: '\u2191',
  down: '\u2193',
  stable: '\u2192',
};

const trendColors = {
  up: 'text-green-500',
  down: 'text-red-500',
  stable: 'text-stone-400',
};

function DataValue({ label, value, unit, trend, sub, className = '' }: DataValueProps) {
  return (
    <div className={`text-center ${className}`}>
      <div className="text-2xl sm:text-3xl font-bold font-data text-stone-900 dark:text-stone-100">
        {value}
        {unit && <span className="text-sm font-normal text-stone-400 ml-1">{unit}</span>}
        {trend && (
          <span className={`text-sm ml-1 ${trendColors[trend]}`}>
            {trendIcons[trend]}
          </span>
        )}
      </div>
      <div className="text-sm text-stone-500 dark:text-stone-400">{label}</div>
      {sub && (
        <div className="text-xs text-stone-400 dark:text-stone-500 mt-1">{sub}</div>
      )}
    </div>
  );
}

export default DataValue;
