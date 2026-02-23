import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { authService } from '../services/auth-service';
import { userService } from '../services/user-service';
import { authenticate } from '../middleware/auth';
import { getDb } from '../db/connection';
import { users } from '../db/schema';
import { config } from '../config';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const result = await authService.register(email, password, name);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Email already registered') {
      return res.status(409).json({ error: error.message });
    }
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid email or password') {
      return res.status(401).json({ error: error.message });
    }
    next(error);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const tokens = await authService.refreshToken(refreshToken);
    res.json(tokens);
  } catch (error) {
    if (error instanceof Error && (error.message === 'Invalid refresh token' || error.message === 'Refresh token expired')) {
      return res.status(401).json({ error: error.message });
    }
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken && req.user) {
      await authService.logout(req.user.userId, refreshToken);
    }
    res.json({ message: 'Logged out' });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.getById(req.user!.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// PUT /api/auth/me
router.put('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email } = req.body;
    const updated = await userService.updateProfile(req.user!.userId, { name, email });
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// PUT /api/auth/password
router.put('/password', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.userId)).limit(1);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, config.auth.bcryptRounds);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, req.user!.userId));

    res.json({ message: 'Password updated' });
  } catch (error) {
    next(error);
  }
});

export default router;
