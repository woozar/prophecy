import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET, PUT } from './route';

// Mock prisma
const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

// Mock session
let mockSession: { userId: string; role: string } | null = null;

vi.mock('@/lib/auth/session', () => ({
  requireSession: vi.fn(async () => {
    if (!mockSession) throw new Error('Nicht angemeldet');
    return mockSession;
  }),
}));

describe('GET /api/users/me/password-login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
  });

  it('returns 401 when not logged in', async () => {
    mockSession = null;

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Nicht angemeldet');
  });

  it('returns 404 when user not found', async () => {
    mockSession = { userId: 'user-1', role: 'USER' };
    mockFindUnique.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Benutzer nicht gefunden');
  });

  it('returns password login status when user has password', async () => {
    mockSession = { userId: 'user-1', role: 'USER' };
    mockFindUnique.mockResolvedValue({
      passwordHash: 'some-hash',
      authenticators: [{ id: 'passkey-1' }],
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.passwordLoginEnabled).toBe(true);
    expect(data.hasPasskeys).toBe(true);
    expect(data.canDisablePasswordLogin).toBe(true);
  });

  it('returns password login disabled when user has no password', async () => {
    mockSession = { userId: 'user-1', role: 'USER' };
    mockFindUnique.mockResolvedValue({
      passwordHash: null,
      authenticators: [{ id: 'passkey-1' }],
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.passwordLoginEnabled).toBe(false);
    expect(data.hasPasskeys).toBe(true);
  });

  it('returns hasPasskeys false when user has no passkeys', async () => {
    mockSession = { userId: 'user-1', role: 'USER' };
    mockFindUnique.mockResolvedValue({
      passwordHash: 'some-hash',
      authenticators: [],
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasPasskeys).toBe(false);
    expect(data.canDisablePasswordLogin).toBe(false);
  });

  it('handles database errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSession = { userId: 'user-1', role: 'USER' };
    mockFindUnique.mockRejectedValue(new Error('Database error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Laden der Einstellung');
    consoleSpy.mockRestore();
  });
});

describe('PUT /api/users/me/password-login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
  });

  it('returns 401 when not logged in', async () => {
    mockSession = null;

    const request = new Request('http://localhost/api/users/me/password-login', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Nicht angemeldet');
  });

  it('returns 400 for invalid request body', async () => {
    mockSession = { userId: 'user-1', role: 'USER' };

    const request = new Request('http://localhost/api/users/me/password-login', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: 'not-a-boolean' }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Ungültige Eingabe');
  });

  it('returns 404 when user not found', async () => {
    mockSession = { userId: 'user-1', role: 'USER' };
    mockFindUnique.mockResolvedValue(null);

    const request = new Request('http://localhost/api/users/me/password-login', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Benutzer nicht gefunden');
  });

  it('returns 400 when trying to disable without passkeys', async () => {
    mockSession = { userId: 'user-1', role: 'USER' };
    mockFindUnique.mockResolvedValue({
      id: 'user-1',
      passwordHash: 'some-hash',
      authenticators: [],
    });

    const request = new Request('http://localhost/api/users/me/password-login', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Passkey');
  });

  it('disables password login when user has passkeys', async () => {
    mockSession = { userId: 'user-1', role: 'USER' };
    mockFindUnique.mockResolvedValue({
      id: 'user-1',
      passwordHash: 'some-hash',
      authenticators: [{ id: 'passkey-1' }],
    });
    mockUpdate.mockResolvedValue({});

    const request = new Request('http://localhost/api/users/me/password-login', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.passwordLoginEnabled).toBe(false);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { passwordHash: null },
    });
  });

  it('returns message when enabling and user already has password', async () => {
    mockSession = { userId: 'user-1', role: 'USER' };
    mockFindUnique.mockResolvedValue({
      id: 'user-1',
      passwordHash: 'existing-hash',
      authenticators: [],
    });

    const request = new Request('http://localhost/api/users/me/password-login', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.passwordLoginEnabled).toBe(true);
    expect(data.message).toContain('bereits aktiviert');
  });

  it('returns message when enabling and user has no password', async () => {
    mockSession = { userId: 'user-1', role: 'USER' };
    mockFindUnique.mockResolvedValue({
      id: 'user-1',
      passwordHash: null,
      authenticators: [],
    });

    const request = new Request('http://localhost/api/users/me/password-login', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.passwordLoginEnabled).toBe(false);
    expect(data.message).toContain('Passwort');
  });

  it('handles database errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSession = { userId: 'user-1', role: 'USER' };
    mockFindUnique.mockRejectedValue(new Error('Database error'));

    const request = new Request('http://localhost/api/users/me/password-login', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Ändern der Einstellung');
    consoleSpy.mockRestore();
  });
});
