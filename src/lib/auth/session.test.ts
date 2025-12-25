import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

// Unmock session module (it's mocked globally in vitest.setup.ts)
vi.unmock('@/lib/auth/session');

// Mock cookies
const mockGet = vi.fn();
const mockSet = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: mockGet,
      set: mockSet,
    })
  ),
}));

// Import after mock setup
import { getSession, requireSession, loginSuccessResponse, loginErrorResponse } from './session';

describe('session utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSession', () => {
    it('returns null when no session cookie exists', async () => {
      mockGet.mockReturnValue(undefined);

      const session = await getSession();
      expect(session).toBeNull();
    });

    it('returns null when session cookie value is empty', async () => {
      mockGet.mockReturnValue({ value: '' });

      const session = await getSession();
      expect(session).toBeNull();
    });

    it('returns parsed session data when valid cookie exists', async () => {
      const sessionData = {
        userId: 'user-1',
        username: 'testuser',
        role: 'USER',
        iat: Date.now(),
      };
      const encoded = Buffer.from(JSON.stringify(sessionData)).toString('base64');
      mockGet.mockReturnValue({ value: encoded });

      const session = await getSession();
      expect(session).toEqual(sessionData);
    });

    it('returns null when cookie contains invalid base64', async () => {
      mockGet.mockReturnValue({ value: '!!invalid!!' });

      const session = await getSession();
      expect(session).toBeNull();
    });
  });

  describe('requireSession', () => {
    it('returns session when valid session exists', async () => {
      const sessionData = {
        userId: 'user-1',
        username: 'testuser',
        role: 'USER',
        iat: Date.now(),
      };
      const encoded = Buffer.from(JSON.stringify(sessionData)).toString('base64');
      mockGet.mockReturnValue({ value: encoded });

      const session = await requireSession();
      expect(session).toEqual(sessionData);
    });

    it('throws error when no session exists', async () => {
      mockGet.mockReturnValue(undefined);

      await expect(requireSession()).rejects.toThrow('Nicht angemeldet');
    });
  });

  describe('loginSuccessResponse', () => {
    it('returns success true', async () => {
      const user = {
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        role: 'USER',
      };

      const response = loginSuccessResponse(user);
      const data = await response.json();

      expect(data.success).toBe(true);
    });

    it('returns user data with role', async () => {
      const user = {
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        role: 'ADMIN',
      };

      const response = loginSuccessResponse(user);
      const data = await response.json();

      expect(data.user).toEqual({
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        role: 'ADMIN',
      });
    });

    it('handles null displayName', async () => {
      const user = {
        id: 'user-1',
        username: 'testuser',
        displayName: null,
        role: 'USER',
      };

      const response = loginSuccessResponse(user);
      const data = await response.json();

      expect(data.user.displayName).toBeNull();
    });

    it('returns NextResponse instance', () => {
      const user = {
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        role: 'USER',
      };

      const response = loginSuccessResponse(user);
      expect(response).toBeInstanceOf(NextResponse);
    });
  });

  describe('loginErrorResponse', () => {
    it('returns 500 status', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = loginErrorResponse(new Error('Test error'), 'Test context');
      expect(response.status).toBe(500);

      consoleSpy.mockRestore();
    });

    it('returns generic error message', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = loginErrorResponse(new Error('Test error'), 'Test context');
      const data = await response.json();
      expect(data.error).toBe('Fehler bei der Anmeldung');

      consoleSpy.mockRestore();
    });

    it('logs error with context', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const testError = new Error('Test error');

      loginErrorResponse(testError, 'Test context');

      expect(consoleSpy).toHaveBeenCalledWith('Test context:', testError);
      consoleSpy.mockRestore();
    });

    it('returns NextResponse instance', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = loginErrorResponse(new Error('Test error'), 'Test context');
      expect(response).toBeInstanceOf(NextResponse);

      consoleSpy.mockRestore();
    });
  });
});
