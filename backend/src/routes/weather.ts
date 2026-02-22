import { Router, Request, Response, NextFunction } from 'express';
import { weatherAggregator } from '../services/weather-aggregator';
import { aviationWeatherService } from '../services/aviation-weather';
import { flightReleaseService } from '../services/flight-release-service';
import { cacheService } from '../services/cache';

const router = Router();

// Validate ICAO code format
const validateIcao = (icao: string): boolean => {
  return /^[A-Z]{4}$/i.test(icao);
};

// GET /api/weather/:icao - Get aggregated weather for an airport
// Optional query params:
//   - refresh: 'true' to bypass cache
//   - time: ISO 8601 datetime string for target time (e.g., '2026-01-27T14:00:00Z')
router.get(
  '/:icao',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { icao } = req.params;
      const refresh = req.query.refresh === 'true';
      const timeParam = req.query.time as string | undefined;

      if (!validateIcao(icao)) {
        return res.status(400).json({
          error: 'Invalid ICAO code',
          message: 'ICAO code must be exactly 4 letters (e.g., KJFK, KLAX)',
        });
      }

      // Parse and validate target time if provided
      let targetTime: Date | undefined;
      if (timeParam) {
        targetTime = new Date(timeParam);
        if (isNaN(targetTime.getTime())) {
          return res.status(400).json({
            error: 'Invalid time format',
            message: 'Time must be a valid ISO 8601 datetime string (e.g., 2026-01-27T14:00:00Z)',
          });
        }

        // Validate time is within reasonable range (not more than 7 days ahead)
        const now = new Date();
        const maxFuture = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        if (targetTime > maxFuture) {
          return res.status(400).json({
            error: 'Time too far in future',
            message: 'Target time cannot be more than 7 days ahead',
          });
        }
      }

      // Clear cache if refresh requested
      if (refresh) {
        cacheService.del(`weather:${icao.toUpperCase()}`);
        cacheService.del(`metar:${icao.toUpperCase()}`);
        cacheService.del(`taf:${icao.toUpperCase()}`);
      }

      const weather = await weatherAggregator.getAggregatedWeather(icao, targetTime);
      res.json(weather);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/weather/:icao/raw - Get raw METAR and TAF strings
router.get(
  '/:icao/raw',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { icao } = req.params;

      if (!validateIcao(icao)) {
        return res.status(400).json({
          error: 'Invalid ICAO code',
          message: 'ICAO code must be exactly 4 letters (e.g., KJFK, KLAX)',
        });
      }

      const data = await aviationWeatherService.getMetarAndTaf(icao);

      res.json({
        icao: icao.toUpperCase(),
        metar: data.metar?.rawOb || null,
        taf: data.taf?.rawTAF || null,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/weather/:icao/metar - Get just METAR data
router.get(
  '/:icao/metar',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { icao } = req.params;

      if (!validateIcao(icao)) {
        return res.status(400).json({
          error: 'Invalid ICAO code',
        });
      }

      const metar = await aviationWeatherService.getMetar(icao);

      if (!metar) {
        return res.status(404).json({
          error: 'METAR not found',
          message: `No METAR data available for ${icao.toUpperCase()}`,
        });
      }

      res.json(metar);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/weather/:icao/taf - Get just TAF data
router.get(
  '/:icao/taf',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { icao } = req.params;

      if (!validateIcao(icao)) {
        return res.status(400).json({
          error: 'Invalid ICAO code',
        });
      }

      const taf = await aviationWeatherService.getTaf(icao);

      if (!taf) {
        return res.status(404).json({
          error: 'TAF not found',
          message: `No TAF data available for ${icao.toUpperCase()}`,
        });
      }

      res.json(taf);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/weather/:icao/release - Generate a Part 135 flight release document
router.get(
  '/:icao/release',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { icao } = req.params;
      const timeParam = req.query.time as string | undefined;

      if (!validateIcao(icao)) {
        return res.status(400).json({
          error: 'Invalid ICAO code',
          message: 'ICAO code must be exactly 4 letters (e.g., KJFK, KLAX)',
        });
      }

      let targetTime: Date | undefined;
      if (timeParam) {
        targetTime = new Date(timeParam);
        if (isNaN(targetTime.getTime())) {
          return res.status(400).json({
            error: 'Invalid time format',
            message: 'Time must be a valid ISO 8601 datetime string',
          });
        }
      }

      const weather = await weatherAggregator.getAggregatedWeather(icao, targetTime);
      const release = flightReleaseService.generate(weather);
      res.json(release);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
