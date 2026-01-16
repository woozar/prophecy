import { beforeEach, describe, expect, it, vi } from 'vitest';

import { validateAdminSession } from '@/lib/auth/admin-validation';
import { prisma } from '@/lib/db/prisma';

import { POST } from './route';

vi.mock('@/lib/auth/admin-validation', () => ({
  validateAdminSession: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
  },
}));

const mockAdminSession = {
  userId: 'admin-1',
  username: 'admin',
  role: 'ADMIN' as const,
  status: 'APPROVED' as const,
};

describe('POST /api/admin/users/[id]/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(validateAdminSession).mockResolvedValue({
      error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) as never,
    });

    const request = new Request('http://localhost/api/admin/users/123/reset-password', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 when user is not admin', async () => {
    vi.mocked(validateAdminSession).mockResolvedValue({
      error: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }) as never,
    });

    const request = new Request('http://localhost/api/admin/users/123/reset-password', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('returns 404 when user not found', async () => {
    vi.mocked(validateAdminSession).mockResolvedValue({ session: mockAdminSession });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const request = new Request('http://localhost/api/admin/users/123/reset-password', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Benutzer nicht gefunden');
  });

  it('resets password successfully', async () => {
    vi.mocked(validateAdminSession).mockResolvedValue({ session: mockAdminSession });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-123',
      username: 'testuser',
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

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
    vi.mocked(validateAdminSession).mockResolvedValue({ session: mockAdminSession });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-123',
      username: 'testuser',
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    const request = new Request('http://localhost/api/admin/users/user-123/reset-password', {
      method: 'POST',
    });

    await POST(request, { params: Promise.resolve({ id: 'user-123' }) });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: expect.objectContaining({
        passwordHash: 'hashed-password',
        forcePasswordChange: true,
      }),
    });
  });

  it('generates URL-safe passwords without special characters', async () => {
    vi.mocked(validateAdminSession).mockResolvedValue({ session: mockAdminSession });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-123',
      username: 'testuser',
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

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
    vi.mocked(validateAdminSession).mockResolvedValue({ session: mockAdminSession });
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'));

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
