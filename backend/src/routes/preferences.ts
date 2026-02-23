import { Router, Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';
import { getDb } from '../db/connection';
import { userPreferences } from '../db/schema';

const router = Router();

router.use(authenticate);

// GET /api/preferences
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, req.user!.userId))
      .limit(1);

    if (!prefs) {
      return res.json({ darkMode: false, recentSearches: [] });
    }

    res.json({
      darkMode: prefs.darkMode,
      recentSearches: prefs.recentSearches,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/preferences
router.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { darkMode, recentSearches } = req.body;
    const db = getDb();

    const [existing] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, req.user!.userId))
      .limit(1);

    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (darkMode !== undefined) data.darkMode = darkMode;
    if (recentSearches !== undefined) data.recentSearches = recentSearches;

    if (existing) {
      await db
        .update(userPreferences)
        .set(data)
        .where(eq(userPreferences.userId, req.user!.userId));
    } else {
      await db.insert(userPreferences).values({
        userId: req.user!.userId,
        darkMode: darkMode ?? false,
        recentSearches: recentSearches ?? [],
      });
    }

    res.json({ message: 'Preferences updated' });
  } catch (error) {
    next(error);
  }
});

export default router;
