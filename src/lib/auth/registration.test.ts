import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  duplicateUsernameResponse,
  normalizeUsername,
  registrationErrorResponse,
  registrationSuccessResponse,
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
});
