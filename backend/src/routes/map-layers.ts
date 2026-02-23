import { Router, Request, Response, NextFunction } from 'express';
import https from 'https';
import { config } from '../config';
import { aviationWeatherService } from '../services/aviation-weather';
import { weatherAggregator } from '../services/weather-aggregator';

const router = Router();

const ALLOWED_OWM_LAYERS = ['clouds_new', 'precipitation_new', 'temp_new', 'wind_new', 'pressure_new'];

// GET /api/map/owm/:layer/:z/:x/:y.png — proxy OWM tiles to hide API key
router.get('/owm/:layer/:z/:x/:y.png', (req, res) => {
  const { layer, z, x, y } = req.params;

  if (!config.owm.apiKey) {
    res.status(404).json({ error: 'Weather map layers not configured' });
    return;
  }

  if (!ALLOWED_OWM_LAYERS.includes(layer)) {
    res.status(400).json({ error: 'Invalid layer' });
    return;
  }

  const url = `https://tile.openweathermap.org/map/${layer}/${z}/${x}/${y}.png?appid=${config.owm.apiKey}`;

  https.get(url, (upstream) => {
    if (upstream.statusCode !== 200) {
      res.status(upstream.statusCode || 502).end();
      return;
    }

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=600');
    upstream.pipe(res);
  }).on('error', () => {
    res.status(502).end();
  });
});

// GET /api/map/pireps?bbox=minLon,minLat,maxLon,maxLat — PIREPs in viewport
router.get('/pireps', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bboxStr = req.query.bbox as string;
    if (!bboxStr) {
      return res.status(400).json({ error: 'bbox query parameter required (minLon,minLat,maxLon,maxLat)' });
    }

    const parts = bboxStr.split(',').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) {
      return res.status(400).json({ error: 'bbox must be 4 comma-separated numbers' });
    }

    const [minLon, minLat, maxLon, maxLat] = parts;
    const rawPireps = await aviationWeatherService.getPirepsByBbox(minLon, minLat, maxLon, maxLat);
    const pireps = weatherAggregator.convertPireps(rawPireps);

    res.json(pireps);
  } catch (error) {
    next(error);
  }
});

// GET /api/map/airsigmets — All active AIR/SIGMETs
router.get('/airsigmets', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rawAirSigmets = await aviationWeatherService.getAllAirSigmets();
    const airSigmets = weatherAggregator.convertAirSigmets(rawAirSigmets);

    res.json(airSigmets);
  } catch (error) {
    next(error);
  }
});

export default router;
