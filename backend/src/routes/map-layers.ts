import { Router } from 'express';
import https from 'https';
import { config } from '../config';

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

export default router;
