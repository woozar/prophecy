import { beforeEach, describe, expect, it, vi } from 'vitest';

import { validateAdminSession } from '@/lib/auth/admin-validation';
import { prisma } from '@/lib/db/prisma';

import { GET } from './route';

const mockAdminSession = {
  userId: 'admin-1',
  username: 'admin',
  role: 'ADMIN' as const,
  status: 'APPROVED' as const,
};

const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  username: 'testuser',
  displayName: 'Test User',
  passwordHash: null,
  forcePasswordChange: false,
  avatarUrl: null,
  avatarEffect: null,
  avatarEffectColors: null,
  animationsEnabled: true,
  role: 'USER',
  status: 'APPROVED',
  isBot: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('GET /api/admin/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(validateAdminSession).mockResolvedValue({
      error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) as never,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 when not admin', async () => {
    vi.mocked(validateAdminSession).mockResolvedValue({
      error: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }) as never,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('returns users when admin', async () => {
    vi.mocked(validateAdminSession).mockResolvedValue({ session: mockAdminSession });
    const mockUsers = [
      createMockUser({ id: '1', username: 'user1' }),
      createMockUser({ id: '2', username: 'user2' }),
    ];
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.users).toHaveLength(2);
    expect(data.users[0].username).toBe('user1');
  });

  it('returns 500 on database error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(validateAdminSession).mockResolvedValue({ session: mockAdminSession });
    vi.mocked(prisma.user.findMany).mockRejectedValue(new Error('DB Error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Laden der Benutzer');
    consoleSpy.mockRestore();
  });
});
