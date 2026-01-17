import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/db/prisma';

import {
  duplicateUsernameResponse,
  findExistingUser,
  normalizeUsername,
  registrationErrorResponse,
  registrationSuccessResponse,
  setPendingUserCookie,
} from './registration';

// Mock prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    set: vi.fn(),
  })),
}));

describe('registration utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('normalizeUsername', () => {
    it('converts username to lowercase', () => {
      expect(normalizeUsername('TestUser')).toBe('testuser');
    });

    it('removes special characters', () => {
      expect(normalizeUsername('test@user!')).toBe('testuser');
    });

    it('preserves allowed characters (a-z, 0-9, _, -)', () => {
      expect(normalizeUsername('test_user-123')).toBe('test_user-123');
    });

    it('handles empty string', () => {
      expect(normalizeUsername('')).toBe('');
    });

    it('removes spaces', () => {
      expect(normalizeUsername('test user')).toBe('testuser');
    });

    it('removes unicode characters', () => {
      expect(normalizeUsername('tëst üser')).toBe('tstser');
    });
  });

  describe('duplicateUsernameResponse', () => {
    it('returns 409 status', async () => {
      const response = duplicateUsernameResponse();
      expect(response.status).toBe(409);
    });

    it('returns correct error message', async () => {
      const response = duplicateUsernameResponse();
      const data = await response.json();
      expect(data.error).toBe('Dieser Benutzername ist bereits vergeben');
    });
  });

  describe('registrationSuccessResponse', () => {
    it('returns success true', async () => {
      const user = {
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        status: 'PENDING',
      };

      const response = registrationSuccessResponse(user);
      const data = await response.json();

      expect(data.success).toBe(true);
    });

    it('returns user data', async () => {
      const user = {
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        status: 'PENDING',
      };

      const response = registrationSuccessResponse(user);
      const data = await response.json();

      expect(data.user).toEqual({
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        status: 'PENDING',
      });
    });

    it('handles null displayName', async () => {
      const user = {
        id: 'user-1',
        username: 'testuser',
        displayName: null,
        status: 'PENDING',
      };

      const response = registrationSuccessResponse(user);
      const data = await response.json();

      expect(data.user.displayName).toBeNull();
    });
  });

  describe('registrationErrorResponse', () => {
    it('returns 500 status', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = registrationErrorResponse(new Error('Test error'), 'Test context');
      expect(response.status).toBe(500);

      consoleSpy.mockRestore();
    });

    it('returns generic error message', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = registrationErrorResponse(new Error('Test error'), 'Test context');
      const data = await response.json();
      expect(data.error).toBe('Fehler bei der Registrierung');

      consoleSpy.mockRestore();
    });

    it('logs error with context', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const testError = new Error('Test error');

      registrationErrorResponse(testError, 'Test context');

      expect(consoleSpy).toHaveBeenCalledWith('Test context:', testError);
      consoleSpy.mockRestore();
    });
  });

  describe('findExistingUser', () => {
    it('normalizes username before searching', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await findExistingUser('TestUser');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
    });

    it('removes special characters from username', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await findExistingUser('Test@User!');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
    });

    it('returns user when found', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        passwordHash: null,
        role: 'USER',
        status: 'PENDING',
        isBot: false,
        forcePasswordChange: false,
        avatarUrl: null,
        avatarEffect: null,
        avatarEffectColors: null,
        animationsEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const result = await findExistingUser('testuser');

      expect(result).toEqual(mockUser);
    });

    it('returns null when user not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await findExistingUser('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('setPendingUserCookie', () => {
    it('sets cookie with correct options', async () => {
      const mockSet = vi.fn();
      const { cookies } = await import('next/headers');
      vi.mocked(cookies).mockResolvedValue({ set: mockSet } as never);

      await setPendingUserCookie('user-123');

      expect(mockSet).toHaveBeenCalledWith('pendingUser', 'user-123', {
        httpOnly: true,
        secure: false, // NODE_ENV is not 'production' in tests
        sameSite: 'strict',
        maxAge: 3600, // 1 hour
        path: '/',
      });
    });
  });
});
