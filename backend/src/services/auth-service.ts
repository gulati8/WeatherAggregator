import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { config } from '../config';
import { getDb } from '../db/connection';
import { users, refreshTokens } from '../db/schema';
import { JwtPayload } from '../middleware/auth';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthResult {
  user: { id: string; email: string; name: string; role: string };
  tokens: AuthTokens;
}

class AuthService {
  private generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.auth.jwtSecret, {
      expiresIn: config.auth.accessTokenExpiry as string & {},
    } as jwt.SignOptions);
  }

  private generateRefreshToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  private async storeRefreshToken(userId: string, token: string): Promise<void> {
    const db = getDb();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.insert(refreshTokens).values({
      userId,
      tokenHash,
      expiresAt,
    });
  }

  async register(email: string, password: string, name: string): Promise<AuthResult> {
    const db = getDb();

    // Check if user already exists
    const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (existing.length > 0) {
      throw new Error('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, config.auth.bcryptRounds);

    const [user] = await db.insert(users).values({
      email: email.toLowerCase(),
      passwordHash,
      name,
      role: 'viewer',
    }).returning();

    const jwtPayload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = this.generateAccessToken(jwtPayload);
    const refreshToken = this.generateRefreshToken();
    await this.storeRefreshToken(user.id, refreshToken);

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tokens: { accessToken, refreshToken },
    };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const db = getDb();

    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid email or password');
    }

    const jwtPayload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = this.generateAccessToken(jwtPayload);
    const refreshToken = this.generateRefreshToken();
    await this.storeRefreshToken(user.id, refreshToken);

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tokens: { accessToken, refreshToken },
    };
  }

  async refreshToken(token: string): Promise<AuthTokens> {
    const db = getDb();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const [stored] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);

    if (!stored) {
      throw new Error('Invalid refresh token');
    }

    if (stored.expiresAt < new Date()) {
      await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));
      throw new Error('Refresh token expired');
    }

    // Delete old token (rotation)
    await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));

    // Get user for new access token
    const [user] = await db.select().from(users).where(eq(users.id, stored.userId)).limit(1);
    if (!user) {
      throw new Error('User not found');
    }

    const jwtPayload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = this.generateAccessToken(jwtPayload);
    const newRefreshToken = this.generateRefreshToken();
    await this.storeRefreshToken(user.id, newRefreshToken);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(userId: string, token: string): Promise<void> {
    const db = getDb();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await db
      .delete(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash));
  }
}

export const authService = new AuthService();
