import { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { sseEmitter } from '@/lib/sse/event-emitter';

import { DELETE, PUT } from './route';

const mockUser = { userId: 'user-1', username: 'testuser', role: 'USER' as const, iat: Date.now() };
const mockAdmin = { userId: 'admin-1', username: 'admin', role: 'ADMIN' as const, iat: Date.now() };

const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  username: 'testuser',
  displayName: 'Test User',
  passwordHash: null,
  forcePasswordChange: false,
  avatarUrl: null,
  avatarEffect: null,
  avatarEffectColors: null,
  role: 'USER',
  status: 'APPROVED',
  isBot: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: {
    prophecies: 5,
    ratings: 10,
  },
  ...overrides,
});

const createRouteParams = (id: string) => ({
  params: Promise.resolve({ id }),
});

describe('PUT /api/admin/users/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/admin/users/user-1', {
      method: 'PUT',
      body: JSON.stringify({ status: 'APPROVED' }),
    });
    const response = await PUT(request, createRouteParams('user-1'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 when not admin', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost/api/admin/users/user-1', {
      method: 'PUT',
      body: JSON.stringify({ status: 'APPROVED' }),
    });
    const response = await PUT(request, createRouteParams('user-1'));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('returns 403 when admin account is suspended', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      createMockUser({ id: 'admin-1', status: 'SUSPENDED', role: 'ADMIN' })
    );

    const request = new NextRequest('http://localhost/api/admin/users/user-1', {
      method: 'PUT',
      body: JSON.stringify({ status: 'APPROVED' }),
    });
    const response = await PUT(request, createRouteParams('user-1'));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Dein Account ist gesperrt');
  });

  it('returns 400 when trying to suspend self', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      createMockUser({ id: 'admin-1', status: 'APPROVED', role: 'ADMIN' })
    );

    const request = new NextRequest('http://localhost/api/admin/users/admin-1', {
      method: 'PUT',
      body: JSON.stringify({ status: 'SUSPENDED' }),
    });
    const response = await PUT(request, createRouteParams('admin-1'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Du kannst dich nicht selbst sperren');
  });

  it('returns 400 when trying to change own role', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      createMockUser({ id: 'admin-1', status: 'APPROVED', role: 'ADMIN' })
    );

    const request = new NextRequest('http://localhost/api/admin/users/admin-1', {
      method: 'PUT',
      body: JSON.stringify({ role: 'USER' }),
    });
    const response = await PUT(request, createRouteParams('admin-1'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Du kannst deine eigene Rolle nicht ändern');
  });

  it('returns 400 when trying to demote last admin', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(createMockUser({ id: 'admin-1', status: 'APPROVED', role: 'ADMIN' }))
      .mockResolvedValueOnce(createMockUser({ id: 'other-admin', role: 'ADMIN' }));
    vi.mocked(prisma.user.count).mockResolvedValue(1);

    const request = new NextRequest('http://localhost/api/admin/users/other-admin', {
      method: 'PUT',
      body: JSON.stringify({ role: 'USER' }),
    });
    const response = await PUT(request, createRouteParams('other-admin'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Der letzte Admin kann nicht degradiert werden');
  });

  it('updates user status successfully', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      createMockUser({ id: 'admin-1', status: 'APPROVED', role: 'ADMIN' })
    );
    vi.mocked(prisma.user.update).mockResolvedValue(createMockUser({ status: 'APPROVED' }));

    const request = new NextRequest('http://localhost/api/admin/users/user-1', {
      method: 'PUT',
      body: JSON.stringify({ status: 'APPROVED' }),
    });
    const response = await PUT(request, createRouteParams('user-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.status).toBe('APPROVED');
    expect(sseEmitter.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'user:updated' })
    );
  });

  it('returns 500 on database error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      createMockUser({ id: 'admin-1', status: 'APPROVED', role: 'ADMIN' })
    );
    vi.mocked(prisma.user.update).mockRejectedValue(new Error('DB Error'));

    const request = new NextRequest('http://localhost/api/admin/users/user-1', {
      method: 'PUT',
      body: JSON.stringify({ status: 'APPROVED' }),
    });
    const response = await PUT(request, createRouteParams('user-1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Aktualisieren des Benutzers');
    consoleSpy.mockRestore();
  });
});

describe('DELETE /api/admin/users/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/admin/users/user-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, createRouteParams('user-1'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 when not admin', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost/api/admin/users/user-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, createRouteParams('user-1'));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('returns 400 when trying to delete self', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      createMockUser({ id: 'admin-1', status: 'APPROVED', role: 'ADMIN' })
    );

    const request = new NextRequest('http://localhost/api/admin/users/admin-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, createRouteParams('admin-1'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Du kannst dich nicht selbst löschen');
  });

  it('returns 400 when trying to delete last admin', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(createMockUser({ id: 'admin-1', status: 'APPROVED', role: 'ADMIN' }))
      .mockResolvedValueOnce(createMockUser({ id: 'other-admin', role: 'ADMIN' }));
    vi.mocked(prisma.user.count).mockResolvedValue(1);

    const request = new NextRequest('http://localhost/api/admin/users/other-admin', {
      method: 'DELETE',
    });
    const response = await DELETE(request, createRouteParams('other-admin'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Der letzte Admin kann nicht gelöscht werden');
  });

  it('deletes user successfully', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(createMockUser({ id: 'admin-1', status: 'APPROVED', role: 'ADMIN' }))
      .mockResolvedValueOnce(createMockUser({ id: 'user-1', role: 'USER' }));
    vi.mocked(prisma.user.delete).mockResolvedValue(createMockUser());

    const request = new NextRequest('http://localhost/api/admin/users/user-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, createRouteParams('user-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(sseEmitter.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'user:deleted' })
    );
  });

  it('returns 500 on database error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(createMockUser({ id: 'admin-1', status: 'APPROVED', role: 'ADMIN' }))
      .mockResolvedValueOnce(createMockUser({ id: 'user-1', role: 'USER' }));
    vi.mocked(prisma.user.delete).mockRejectedValue(new Error('DB Error'));

    const request = new NextRequest('http://localhost/api/admin/users/user-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, createRouteParams('user-1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Löschen des Benutzers');
    consoleSpy.mockRestore();
  });
});
