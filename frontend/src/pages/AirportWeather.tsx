import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWeather, useFavorites, useRecentSearches } from '../hooks/useWeather';
import AirportSearch from '../components/AirportSearch';
import LoadingSpinner from '../components/LoadingSpinner';
import CurrentConditions from '../components/CurrentConditions';
import SourceComparison from '../components/SourceComparison';
import SourceComparisonDetailed from '../components/SourceComparisonDetailed';
import ConsensusIndicator from '../components/ConsensusIndicator';
import Part135Summary from '../components/Part135Summary';
import FratDisplay from '../components/FratDisplay';
import ForecastTimeline from '../components/ForecastTimeline';
import WeatherChart from '../components/WeatherChart';
import AlertDisplay from '../components/AlertDisplay';
import PirepDisplay from '../components/PirepDisplay';
import AirSigmetDisplay from '../components/AirSigmetDisplay';
import TargetTimeDisplay from '../components/TargetTimeDisplay';
import WindsAloftDisplay from '../components/WindsAloftDisplay';
import NotamDisplay from '../components/NotamDisplay';
import ExpandableSection from '../components/ui/ExpandableSection';
import { formatRelativeTime } from '../utils/formatters';
import { FRIENDLY_LABELS } from '../utils/personality';
import { useEffect, useMemo } from 'react';

const stagger = {
  container: {
    animate: { transition: { staggerChildren: 0.07 } },
  },
  item: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  },
};

function AirportWeather() {
  const { icao } = useParams<{ icao: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Parse target time from URL
  const targetTime = useMemo(() => {
    const timeParam = searchParams.get('time');
    if (!timeParam) return null;
    const date = new Date(timeParam);
    return isNaN(date.getTime()) ? null : date;
  }, [searchParams]);

  const { data, loading, error, refresh } = useWeather(icao, targetTime);
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const { addRecent } = useRecentSearches();

  // Add to recent searches when viewing
  useEffect(() => {
    if (icao) {
      addRecent(icao);
    }
  }, [icao, addRecent]);

  const handleSearch = (newIcao: string, newTargetTime: Date | null) => {
    const url = newTargetTime
      ? `/weather/${newIcao.toUpperCase()}?time=${newTargetTime.toISOString()}`
      : `/weather/${newIcao.toUpperCase()}`;
    navigate(url);
  };

  const clearTargetTime = () => {
    if (icao) {
      navigate(`/weather/${icao.toUpperCase()}`);
    }
  };

  const toggleFavorite = () => {
    if (!icao) return;
    if (isFavorite(icao)) {
      removeFavorite(icao);
    } else {
      addFavorite(icao);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Search bar */}
      <div className="max-w-xl mb-6">
        <AirportSearch
          onSearch={handleSearch}
          initialValue={icao}
          initialTime={targetTime}
        />
      </div>

      {loading && <LoadingSpinner />}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-card p-6 text-center">
          <svg
            className="w-12 h-12 text-red-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
            Error Loading Weather
          </h3>
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-red-600 text-white rounded-card hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {data && (
        <motion.div
          variants={stagger.container}
          initial="initial"
          animate="animate"
        >
          {/* Target time banner */}
          {data.atTargetTime && (
            <motion.div variants={stagger.item}>
              <TargetTimeDisplay
                snapshot={data.atTargetTime}
                onClear={clearTargetTime}
              />
            </motion.div>
          )}

          {/* Alerts — always visible (safety-critical) */}
          {data.alerts.length > 0 && (
            <motion.div variants={stagger.item} className="mb-6">
              <AlertDisplay alerts={data.alerts} />
            </motion.div>
          )}

          {/* SIGMETs/AIRMETs — always visible (safety-critical) */}
          {data.airSigmets && data.airSigmets.length > 0 && (
            <motion.div variants={stagger.item} className="mb-6">
              <AirSigmetDisplay airSigmets={data.airSigmets} />
            </motion.div>
          )}

          {/* PIREPs — always visible (safety-critical) */}
          {data.pireps && data.pireps.length > 0 && (
            <motion.div variants={stagger.item} className="mb-6">
              <PirepDisplay pireps={data.pireps} />
            </motion.div>
          )}

          {/* Layer 1: Hero Summary — Airport header + conditions + Part 135 */}
          <motion.div variants={stagger.item} className="card p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold font-display text-stone-900 dark:text-stone-100">
                    {data.airport.icao}
                  </h1>
                  <button
                    onClick={toggleFavorite}
                    className={`p-2 rounded-full transition-colors ${
                      isFavorite(data.airport.icao)
                        ? 'text-yellow-500 hover:text-yellow-600'
                        : 'text-stone-300 dark:text-stone-500 hover:text-yellow-500'
                    }`}
                    title={
                      isFavorite(data.airport.icao)
                        ? 'Remove from favorites'
                        : 'Add to favorites'
                    }
                  >
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                </div>
                <p className="text-lg text-stone-600 dark:text-stone-400">{data.airport.name}</p>
                {data.airport.city && (
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    {data.airport.city}
                    {data.airport.country && `, ${data.airport.country}`}
                  </p>
                )}
                <p className="text-sm text-teal-600 dark:text-teal-400 mt-1 font-medium">
                  {FRIENDLY_LABELS[data.current.flightCategory.value]}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-stone-500 dark:text-stone-400">
                  Last updated: {formatRelativeTime(data.timestamp)}
                </div>
                <button
                  onClick={refresh}
                  className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 text-sm text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-card transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Refresh
                </button>
                {data.airport.elevation > 0 && (
                  <div className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                    Elevation: {data.airport.elevation.toLocaleString()} ft
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Main grid — conditions + Part 135 */}
          <motion.div variants={stagger.item} className="grid lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2">
              <CurrentConditions
                conditions={data.current}
                targetTimeLabel={
                  data.atTargetTime
                    ? new Date(data.atTargetTime.targetTime).toLocaleString()
                    : undefined
                }
              />
            </div>
            <div className="space-y-6">
              <Part135Summary
                status={data.part135Status}
                isForTargetTime={!!data.atTargetTime}
              />
              {data.frat && <FratDisplay frat={data.frat} />}
            </div>
          </motion.div>

          {/* Layer 2: Source comparison + consensus (default open) */}
          <motion.div variants={stagger.item} className="card p-6 mb-6">
            <ExpandableSection title="Source Comparison & Consensus" defaultOpen>
              <div className="grid lg:grid-cols-2 gap-6 mt-4">
                <SourceComparison
                  sources={data.sources}
                  current={data.current}
                />
                <ConsensusIndicator consensus={data.consensus} />
              </div>
            </ExpandableSection>
          </motion.div>

          {/* Forecast timeline (default open) */}
          <motion.div variants={stagger.item} className="card p-6 mb-6">
            <ExpandableSection title="Forecast Timeline" defaultOpen>
              <div className="mt-4">
                <ForecastTimeline
                  forecast={data.forecast}
                  highlightTime={data.atTargetTime?.targetTime}
                />
              </div>
            </ExpandableSection>
          </motion.div>

          {/* Layer 2/3: Collapsible sections */}
          <motion.div variants={stagger.item} className="card p-6 mb-6">
            <ExpandableSection title="NOTAMs">
              <div className="mt-4">
                <NotamDisplay icao={data.airport.icao} />
              </div>
            </ExpandableSection>
          </motion.div>

          <motion.div variants={stagger.item} className="card p-6 mb-6">
            <ExpandableSection title="Winds Aloft">
              <div className="mt-4">
                <WindsAloftDisplay icao={data.airport.icao} />
              </div>
            </ExpandableSection>
          </motion.div>

          {/* Layer 3: Detailed source comparison + charts (collapsed) */}
          <motion.div variants={stagger.item} className="card p-6 mb-6">
            <ExpandableSection title="Detailed Source Comparison">
              <div className="mt-4">
                <SourceComparisonDetailed
                  sources={data.sources}
                  current={data.current}
                  forecast={data.forecast}
                />
              </div>
            </ExpandableSection>
          </motion.div>

          <motion.div variants={stagger.item} className="card p-6 mb-6">
            <ExpandableSection title="Weather Charts">
              <div className="mt-4">
                <WeatherChart
                  forecast={data.forecast}
                  highlightTime={data.atTargetTime?.targetTime}
                />
              </div>
            </ExpandableSection>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

export default AirportWeather;
