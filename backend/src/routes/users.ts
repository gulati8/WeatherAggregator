import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { userService } from '../services/user-service';

const router = Router();

// All routes require admin role
router.use(authenticate, requireRole('admin'));

// GET /api/users
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const usersList = await userService.listUsers();
    res.json(usersList);
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/:id/role
router.put('/:id/role', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['admin', 'dispatcher', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Valid role is required (admin, dispatcher, viewer)' });
    }

    // Prevent self-demotion
    if (id === req.user!.userId && role !== 'admin') {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const updated = await userService.updateRole(id, role);
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (id === req.user!.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const deleted = await userService.deleteUser(id);
    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
