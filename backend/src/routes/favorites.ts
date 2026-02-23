import { Router, Request, Response, NextFunction } from 'express';
import { eq, and } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';
import { getDb } from '../db/connection';
import { favorites } from '../db/schema';

const router = Router();

router.use(authenticate);

// GET /api/favorites
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const userFavorites = await db
      .select({ icao: favorites.icao, createdAt: favorites.createdAt })
      .from(favorites)
      .where(eq(favorites.userId, req.user!.userId))
      .orderBy(favorites.createdAt);

    res.json(userFavorites.map((f) => f.icao));
  } catch (error) {
    next(error);
  }
});

// POST /api/favorites
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { icao } = req.body;

    if (!icao || !/^[A-Z]{4}$/i.test(icao)) {
      return res.status(400).json({ error: 'Valid ICAO code is required' });
    }

    const db = getDb();
    const normalized = icao.toUpperCase();

    // Check for duplicate
    const existing = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, req.user!.userId), eq(favorites.icao, normalized)))
      .limit(1);

    if (existing.length > 0) {
      return res.json({ icao: normalized, message: 'Already a favorite' });
    }

    await db.insert(favorites).values({
      userId: req.user!.userId,
      icao: normalized,
    });

    res.status(201).json({ icao: normalized });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/favorites/:icao
router.delete('/:icao', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { icao } = req.params;
    const db = getDb();

    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, req.user!.userId), eq(favorites.icao, icao.toUpperCase())));

    res.json({ message: 'Favorite removed' });
  } catch (error) {
    next(error);
  }
});

export default router;
