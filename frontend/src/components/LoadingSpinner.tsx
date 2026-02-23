interface LoadingSpinnerProps {
  message?: string;
}

function LoadingSpinner({ message = 'Loading weather data...' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-200 border-t-teal-600 mb-4"></div>
      <p className="text-stone-600">{message}</p>
    </div>
  );
}

export default LoadingSpinner;
