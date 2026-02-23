import { eq } from 'drizzle-orm';
import { getDb } from '../db/connection';
import { users, refreshTokens, favorites, userPreferences, trips } from '../db/schema';

class UserService {
  async getById(userId: string) {
    const db = getDb();
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user || null;
  }

  async getByEmail(email: string) {
    const db = getDb();
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    return user || null;
  }

  async updateProfile(userId: string, updates: { name?: string; email?: string }) {
    const db = getDb();
    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.name) data.name = updates.name;
    if (updates.email) data.email = updates.email.toLowerCase();

    const [updated] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      });

    return updated || null;
  }

  async updateRole(userId: string, role: 'admin' | 'dispatcher' | 'viewer') {
    const db = getDb();
    const [updated] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      });

    return updated || null;
  }

  async listUsers() {
    const db = getDb();
    return db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.createdAt);
  }

  async deleteUser(userId: string): Promise<boolean> {
    const db = getDb();
    const result = await db.delete(users).where(eq(users.id, userId)).returning({ id: users.id });
    return result.length > 0;
  }
}

export const userService = new UserService();
