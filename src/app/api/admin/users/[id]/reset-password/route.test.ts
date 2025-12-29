import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

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

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
  },
}));

describe('POST /api/admin/users/[id]/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
  });

  it('returns 401 when not logged in', async () => {
    mockSession = null;

    const request = new Request('http://localhost/api/admin/users/123/reset-password', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Nicht angemeldet');
  });

  it('returns 403 when user is not admin', async () => {
    mockSession = { userId: 'user-1', role: 'USER' };

    const request = new Request('http://localhost/api/admin/users/123/reset-password', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Nicht autorisiert');
  });

  it('returns 404 when user not found', async () => {
    mockSession = { userId: 'admin-1', role: 'ADMIN' };
    mockFindUnique.mockResolvedValue(null);

    const request = new Request('http://localhost/api/admin/users/123/reset-password', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Benutzer nicht gefunden');
  });

  it('resets password successfully', async () => {
    mockSession = { userId: 'admin-1', role: 'ADMIN' };
    mockFindUnique.mockResolvedValue({ id: 'user-123', username: 'testuser' });
    mockUpdate.mockResolvedValue({});

    const request = new Request('http://localhost/api/admin/users/user-123/reset-password', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'user-123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.newPassword).toBeDefined();
    expect(data.newPassword.length).toBe(12);
    expect(data.message).toContain('testuser');
  });

  it('sets forcePasswordChange flag when resetting password', async () => {
    mockSession = { userId: 'admin-1', role: 'ADMIN' };
    mockFindUnique.mockResolvedValue({ id: 'user-123', username: 'testuser' });
    mockUpdate.mockResolvedValue({});

    const request = new Request('http://localhost/api/admin/users/user-123/reset-password', {
      method: 'POST',
    });

    await POST(request, { params: Promise.resolve({ id: 'user-123' }) });

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: expect.objectContaining({
        passwordHash: 'hashed-password',
        forcePasswordChange: true,
      }),
    });
  });

  it('generates URL-safe passwords without special characters', async () => {
    mockSession = { userId: 'admin-1', role: 'ADMIN' };
    mockFindUnique.mockResolvedValue({ id: 'user-123', username: 'testuser' });
    mockUpdate.mockResolvedValue({});

    const request = new Request('http://localhost/api/admin/users/user-123/reset-password', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'user-123' }) });
    const data = await response.json();

    // Password should not contain +, /, or =
    expect(data.newPassword).not.toContain('+');
    expect(data.newPassword).not.toContain('/');
    expect(data.newPassword).not.toContain('=');
  });

  it('handles database errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSession = { userId: 'admin-1', role: 'ADMIN' };
    mockFindUnique.mockRejectedValue(new Error('Database error'));

    const request = new Request('http://localhost/api/admin/users/user-123/reset-password', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'user-123' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Zurücksetzen des Passworts');
    consoleSpy.mockRestore();
  });
});
