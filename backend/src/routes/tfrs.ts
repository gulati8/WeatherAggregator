import { Router, Request, Response, NextFunction } from 'express';
import { tfrService } from '../services/tfr-service';

const router = Router();

// GET /api/tfrs — All active TFRs (optionally filtered by proximity)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lon = req.query.lon ? parseFloat(req.query.lon as string) : undefined;
    const radius = req.query.radius ? parseFloat(req.query.radius as string) : 100;

    if (lat != null && lon != null && !isNaN(lat) && !isNaN(lon)) {
      const tfrs = await tfrService.getNearbyTfrs(lat, lon, radius);
      return res.json(tfrs);
    }

    const tfrs = await tfrService.getAllTfrs();
    res.json(tfrs);
  } catch (error) {
    next(error);
  }
});

export default router;
