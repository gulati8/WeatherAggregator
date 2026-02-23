import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AirportSearch from '../components/AirportSearch';
import Card from '../components/ui/Card';
import { useFavorites, useRecentSearches } from '../hooks/useWeather';
import { getGreeting } from '../utils/personality';

const QUICK_AIRPORTS = ['KJFK', 'KLAX', 'KORD', 'KATL', 'EGLL', 'RJTT'];

function Home() {
  const navigate = useNavigate();
  const { favorites, removeFavorite } = useFavorites();
  const { recent, clearRecent } = useRecentSearches();

  const handleSearch = (icao: string) => {
    navigate(`/weather/${icao.toUpperCase()}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-12">
      {/* Hero section */}
      <motion.div
        className="text-center mb-6 sm:mb-12"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="text-sm text-teal-600 dark:text-teal-400 font-medium mb-2">
          {getGreeting()}
        </p>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display text-stone-900 dark:text-stone-100 mb-4">
          Aviation Weather Aggregator
        </h1>
        <p className="text-lg text-stone-600 dark:text-stone-400 max-w-2xl mx-auto">
          Compare weather data from multiple sources to make informed flight
          planning decisions. Get consensus reports and Part 135 compliance
          checks for any airport.
        </p>
      </motion.div>

      {/* Search */}
      <div className="max-w-md mx-auto mb-4">
        <AirportSearch onSearch={handleSearch} />
      </div>

      {/* Quick suggestion pills */}
      <div className="flex flex-wrap justify-center gap-2 mb-8 sm:mb-12">
        {QUICK_AIRPORTS.map((icao) => (
          <button
            key={icao}
            onClick={() => handleSearch(icao)}
            className="px-3 py-1 text-xs font-data font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-900/50 rounded-full transition-colors"
          >
            {icao}
          </button>
        ))}
      </div>

      {/* Quick access sections */}
      <div className="grid md:grid-cols-2 gap-4 sm:gap-8">
        {/* Favorites */}
        <Card padding="lg">
          <h2 className="text-lg font-semibold font-display text-stone-900 dark:text-stone-100 mb-4 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-yellow-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Favorite Airports
          </h2>
          {favorites.length > 0 ? (
            <div className="space-y-2">
              {favorites.map((icao) => (
                <div
                  key={icao}
                  className="flex items-center justify-between p-3 bg-cream-50 dark:bg-stone-700 rounded-card hover:bg-stone-100 dark:hover:bg-stone-600 transition-colors"
                >
                  <button
                    onClick={() => handleSearch(icao)}
                    className="font-data font-semibold text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
                  >
                    {icao}
                  </button>
                  <button
                    onClick={() => removeFavorite(icao)}
                    className="text-stone-400 hover:text-red-500"
                    title="Remove from favorites"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-stone-500 dark:text-stone-400 text-sm">
              No favorites yet. Search for an airport and click the star to add
              it here.
            </p>
          )}
        </Card>

        {/* Recent searches */}
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold font-display text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-stone-500 dark:text-stone-400"
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
              Recent Searches
            </h2>
            {recent.length > 0 && (
              <button
                onClick={clearRecent}
                className="text-sm text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
              >
                Clear
              </button>
            )}
          </div>
          {recent.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {recent.map((icao) => (
                <button
                  key={icao}
                  onClick={() => handleSearch(icao)}
                  className="px-4 py-2.5 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 rounded-full font-data text-sm font-semibold text-stone-700 dark:text-stone-300 transition-colors"
                >
                  {icao}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-stone-500 dark:text-stone-400 text-sm">
              Your recent airport searches will appear here.
            </p>
          )}
        </Card>
      </div>

      {/* Did You Know? */}
      <div className="mt-12 bg-teal-50 dark:bg-teal-900/20 rounded-card border border-teal-200 dark:border-teal-800 p-6">
        <h3 className="font-semibold font-display text-teal-900 dark:text-teal-200 mb-3">Did You Know?</h3>
        <ul className="text-sm text-teal-800 dark:text-teal-300 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-teal-500 dark:text-teal-400 mt-0.5">&#8226;</span>
            Enter any 4-letter ICAO airport code (e.g., KJFK, KLAX, EGLL)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal-500 dark:text-teal-400 mt-0.5">&#8226;</span>
            Weather data is aggregated from Aviation Weather Center, Open-Meteo,
            and NWS
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal-500 dark:text-teal-400 mt-0.5">&#8226;</span>
            Part 135 compliance is automatically checked for ceiling and
            visibility minimums
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal-500 dark:text-teal-400 mt-0.5">&#8226;</span>
            Consensus indicators show where sources agree or disagree
          </li>
        </ul>
      </div>
    </div>
  );
}

export default Home;
