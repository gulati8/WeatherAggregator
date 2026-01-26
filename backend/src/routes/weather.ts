import { Router, Request, Response, NextFunction } from 'express';
import { weatherAggregator } from '../services/weather-aggregator';
import { aviationWeatherService } from '../services/aviation-weather';
import { cacheService } from '../services/cache';

const router = Router();

// Validate ICAO code format
const validateIcao = (icao: string): boolean => {
  return /^[A-Z]{4}$/i.test(icao);
};

// GET /api/weather/:icao - Get aggregated weather for an airport
router.get(
  '/:icao',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { icao } = req.params;
      const refresh = req.query.refresh === 'true';

      if (!validateIcao(icao)) {
        return res.status(400).json({
          error: 'Invalid ICAO code',
          message: 'ICAO code must be exactly 4 letters (e.g., KJFK, KLAX)',
        });
      }

      // Clear cache if refresh requested
      if (refresh) {
        cacheService.del(`weather:${icao.toUpperCase()}`);
        cacheService.del(`metar:${icao.toUpperCase()}`);
        cacheService.del(`taf:${icao.toUpperCase()}`);
      }

      const weather = await weatherAggregator.getAggregatedWeather(icao);
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

export default router;
