import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/session';

const mockUser = { userId: 'user-1', username: 'testuser', role: 'USER' as const, iat: Date.now() };
const mockAdmin = { userId: 'admin-1', username: 'admin', role: 'ADMIN' as const, iat: Date.now() };

const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  username: 'testuser',
  displayName: 'Test User',
  passwordHash: null,
  avatarUrl: null,
  avatarEffect: null,
  avatarEffectColors: null,
  role: 'USER',
  status: 'APPROVED',
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: {
    prophecies: 5,
    ratings: 10,
  },
  ...overrides,
});

describe('GET /api/admin/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 when not admin', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('returns users when admin', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    const mockUsers = [
      createMockUser({ id: '1', username: 'user1' }),
      createMockUser({ id: '2', username: 'user2' }),
    ];
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.users).toHaveLength(2);
    expect(data.users[0]._count.prophecies).toBe(5);
  });

  it('returns 500 on database error', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    vi.mocked(prisma.user.findMany).mockRejectedValue(new Error('DB Error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Laden der Benutzer');
  });
});
