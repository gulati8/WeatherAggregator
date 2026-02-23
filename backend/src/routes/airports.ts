import { Router } from 'express';
import { airportSearch } from '../services/airport-search';

const router = Router();

// GET /api/airports/search?q=<query>&limit=10
router.get('/search', (req, res) => {
  const q = (req.query.q as string || '').trim();
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 20);

  if (!q) {
    res.json([]);
    return;
  }

  const results = airportSearch.search(q, limit);
  res.json(results);
});

export default router;
