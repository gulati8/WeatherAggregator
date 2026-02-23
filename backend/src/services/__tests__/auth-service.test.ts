import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  delete: vi.fn().mockReturnThis(),
};

vi.mock('../../db/connection', () => ({
  getDb: () => mockDb,
}));

vi.mock('../../db/schema', () => ({
  users: { id: 'id', email: 'email', passwordHash: 'passwordHash' },
  refreshTokens: { id: 'id', tokenHash: 'tokenHash', userId: 'userId' },
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$12$hashedpassword'),
    compare: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('mock-access-token'),
  },
}));

vi.mock('../../config', () => ({
  config: {
    auth: {
      jwtSecret: 'test-secret',
      accessTokenExpiry: '15m',
      bcryptRounds: 12,
    },
  },
}));

import { authService } from '../auth-service';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the chainable mock methods
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.insert.mockReturnThis();
    mockDb.values.mockReturnThis();
    mockDb.delete.mockReturnThis();
  });

  describe('register()', () => {
    it('hashes the password and creates a new user', async () => {
      // No existing user
      mockDb.limit.mockResolvedValueOnce([]);

      // Insert returns new user
      mockDb.returning.mockResolvedValueOnce([{
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'viewer',
        passwordHash: '$2b$12$hashedpassword',
      }]);

      // Store refresh token insert
      mockDb.returning.mockResolvedValueOnce(undefined);

      const result = await authService.register('test@example.com', 'password123', 'Test User');

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.name).toBe('Test User');
      expect(result.user.role).toBe('viewer');
      expect(result.tokens.accessToken).toBe('mock-access-token');
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('throws when email is already registered', async () => {
      // Existing user found
      mockDb.limit.mockResolvedValueOnce([{
        id: 'existing-user',
        email: 'test@example.com',
      }]);

      await expect(
        authService.register('test@example.com', 'password123', 'Test User')
      ).rejects.toThrow('Email already registered');
    });
  });

  describe('login()', () => {
    it('returns tokens for valid credentials', async () => {
      // User exists
      mockDb.limit.mockResolvedValueOnce([{
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'dispatcher',
        passwordHash: '$2b$12$hashedpassword',
      }]);

      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);

      // Store refresh token
      mockDb.returning.mockResolvedValueOnce(undefined);

      const result = await authService.login('test@example.com', 'correctpassword');

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.role).toBe('dispatcher');
      expect(result.tokens.accessToken).toBe('mock-access-token');
      expect(jwt.sign).toHaveBeenCalled();
    });

    it('throws for wrong password', async () => {
      // User exists
      mockDb.limit.mockResolvedValueOnce([{
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: '$2b$12$hashedpassword',
      }]);

      vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);

      await expect(
        authService.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid email or password');
    });

    it('throws for non-existent email', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(
        authService.login('nobody@example.com', 'password')
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('refreshToken()', () => {
    it('rotates tokens on valid refresh', async () => {
      // Find stored token
      mockDb.limit.mockResolvedValueOnce([{
        id: 'token-1',
        userId: 'user-1',
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 86400000), // Tomorrow
      }]);

      // Delete old token
      mockDb.returning.mockResolvedValueOnce(undefined);

      // Find user
      mockDb.limit.mockResolvedValueOnce([{
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'viewer',
      }]);

      // Store new refresh token
      mockDb.returning.mockResolvedValueOnce(undefined);

      const result = await authService.refreshToken('valid-refresh-token');

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      // Should have deleted the old token
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('throws for invalid refresh token', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(
        authService.refreshToken('invalid-token')
      ).rejects.toThrow('Invalid refresh token');
    });

    it('throws for expired refresh token', async () => {
      mockDb.limit.mockResolvedValueOnce([{
        id: 'token-1',
        userId: 'user-1',
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() - 86400000), // Yesterday
      }]);

      // Delete expired token
      mockDb.returning.mockResolvedValueOnce(undefined);

      await expect(
        authService.refreshToken('expired-token')
      ).rejects.toThrow('Refresh token expired');
    });
  });

  describe('logout()', () => {
    it('deletes the refresh token', async () => {
      mockDb.returning.mockResolvedValueOnce(undefined);

      await authService.logout('user-1', 'some-refresh-token');

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});
