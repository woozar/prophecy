import { NextResponse } from 'next/server';

import { SignJWT } from 'jose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Import after mock setup
import {
  getSession,
  loginErrorResponse,
  loginSuccessResponse,
  requireSession,
  resetSecretCache,
  setSessionCookie,
} from './session';

// Set SESSION_SECRET for tests before importing session module
const TEST_SECRET = 'test-session-secret-at-least-32-chars-long';
vi.stubEnv('SESSION_SECRET', TEST_SECRET);

// Mock cookies - capture values set and return them
let mockCookieValue: string | undefined;

const mockGet = vi.fn(() => (mockCookieValue ? { value: mockCookieValue } : undefined));
const mockSet = vi.fn((_name: string, value: string) => {
  mockCookieValue = value;
});

vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: mockGet,
      set: mockSet,
    })
  ),
}));

describe('session utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieValue = undefined;
    resetSecretCache();
  });

  afterEach(() => {
    resetSecretCache();
  });

  describe('getSession', () => {
    it('returns null when no session cookie exists', async () => {
      mockCookieValue = undefined;

      const session = await getSession();
      expect(session).toBeNull();
    });

    it('returns null when session cookie value is empty', async () => {
      mockCookieValue = '';

      const session = await getSession();
      expect(session).toBeNull();
    });

    it('returns parsed session data when valid JWT exists', async () => {
      // Use setSessionCookie to create a valid token
      await setSessionCookie({
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        role: 'USER',
      });

      const session = await getSession();
      expect(session).toMatchObject({
        userId: 'user-1',
        username: 'testuser',
        role: 'USER',
      });
      expect(session?.iat).toBeDefined();
    });

    it('returns null when token is invalid', async () => {
      mockCookieValue = 'invalid-token';

      const session = await getSession();
      expect(session).toBeNull();
    });

    it('returns null when token is tampered with', async () => {
      // Create a valid token first
      await setSessionCookie({
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        role: 'USER',
      });

      // Tamper with the token
      if (mockCookieValue) {
        mockCookieValue = mockCookieValue.slice(0, -5) + 'XXXXX';
      }

      const session = await getSession();
      expect(session).toBeNull();
    });

    it('returns null when token was signed with different secret', async () => {
      // Create a token with a different secret
      const wrongSecret = new TextEncoder().encode('completely-different-secret-key-here');
      const token = await new SignJWT({
        userId: 'user-1',
        username: 'testuser',
        role: 'USER',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(wrongSecret);

      mockCookieValue = token;

      const session = await getSession();
      expect(session).toBeNull();
    });
  });

  describe('requireSession', () => {
    it('returns session when valid JWT exists', async () => {
      await setSessionCookie({
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        role: 'USER',
      });

      const session = await requireSession();
      expect(session).toMatchObject({
        userId: 'user-1',
        username: 'testuser',
        role: 'USER',
      });
    });

    it('throws error when no session exists', async () => {
      mockCookieValue = undefined;

      await expect(requireSession()).rejects.toThrow('Nicht angemeldet');
    });
  });

  describe('setSessionCookie', () => {
    it('sets httpOnly cookie with JWT token', async () => {
      await setSessionCookie({
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        role: 'ADMIN',
      });

      expect(mockSet).toHaveBeenCalledWith(
        'session',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
        })
      );

      // Verify the token is a valid JWT format (header.payload.signature)
      const token = mockSet.mock.calls[0][1];
      expect(token.split('.').length).toBe(3);
    });

    it('creates token that can be verified by getSession', async () => {
      await setSessionCookie({
        id: 'admin-1',
        username: 'admin',
        displayName: 'Admin User',
        role: 'ADMIN',
      });

      const session = await getSession();
      expect(session).toMatchObject({
        userId: 'admin-1',
        username: 'admin',
        role: 'ADMIN',
      });
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

  describe('getSessionSecret fallback', () => {
    it('warns and generates random secret when SESSION_SECRET is not set', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Remove SESSION_SECRET and reset cache
      vi.stubEnv('SESSION_SECRET', '');
      resetSecretCache();

      // Force secret generation by creating a session
      await setSessionCookie({
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        role: 'USER',
      });

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('SESSION_SECRET nicht gesetzt'));

      warnSpy.mockRestore();
      // Restore valid secret for other tests
      vi.stubEnv('SESSION_SECRET', TEST_SECRET);
      resetSecretCache();
    });

    it('warns when SESSION_SECRET is too short', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Set a secret that's too short (< 32 chars)
      vi.stubEnv('SESSION_SECRET', 'short-secret');
      resetSecretCache();

      await setSessionCookie({
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        role: 'USER',
      });

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('SESSION_SECRET nicht gesetzt'));

      warnSpy.mockRestore();
      // Restore valid secret for other tests
      vi.stubEnv('SESSION_SECRET', TEST_SECRET);
      resetSecretCache();
    });
  });
});
