import { beforeEach, describe, expect, it, vi } from 'vitest';

import { validateSession } from '@/lib/auth/admin-validation';
import { prisma } from '@/lib/db/prisma';

import { GET } from './route';

vi.mock('@/lib/auth/admin-validation', () => ({
  validateSession: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
  },
}));

const mockSession = {
  userId: 'user-1',
  username: 'testuser',
  role: 'USER' as const,
  status: 'APPROVED' as const,
};

const mockAdminSession = {
  userId: 'admin-1',
  username: 'admin',
  role: 'ADMIN' as const,
  status: 'APPROVED' as const,
};

const mockUsers = [
  {
    id: 'user-1',
    username: 'testuser',
    displayName: 'Test User',
    avatarUrl: '/avatars/test.webp',
    avatarEffect: 'glow',
    avatarEffectColors: '["cyan","teal"]',
    role: 'USER',
    status: 'APPROVED',
    isBot: false,
    createdAt: new Date('2025-01-01'),
    passwordHash: null,
    forcePasswordChange: false,
    updatedAt: new Date('2025-01-01'),
    badges: [
      {
        id: 'ub-1',
        earnedAt: new Date('2025-01-05'),
        badge: {
          id: 'badge-1',
          key: 'creator_1',
          name: 'Anfänger-Seher',
          icon: '🔮',
        },
      },
    ],
  },
  {
    id: 'user-2',
    username: 'anotheruser',
    displayName: null,
    avatarUrl: null,
    avatarEffect: null,
    avatarEffectColors: null,
    role: 'USER',
    status: 'APPROVED',
    isBot: false,
    createdAt: new Date('2025-01-02'),
    passwordHash: null,
    forcePasswordChange: false,
    updatedAt: new Date('2025-01-02'),
    badges: [],
  },
];

const mockPendingUser = {
  id: 'user-3',
  username: 'pendinguser',
  displayName: 'Pending User',
  avatarUrl: null,
  avatarEffect: null,
  avatarEffectColors: null,
  role: 'USER',
  status: 'PENDING',
  isBot: false,
  createdAt: new Date('2025-01-03'),
  passwordHash: null,
  forcePasswordChange: false,
  updatedAt: new Date('2025-01-03'),
  badges: [],
};

describe('GET /api/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(validateSession).mockResolvedValue({
      error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) as never,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns only approved users for normal users', async () => {
    vi.mocked(validateSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.users).toHaveLength(2);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'APPROVED' },
      })
    );
  });

  it('returns all users for admins', async () => {
    vi.mocked(validateSession).mockResolvedValue({ session: mockAdminSession });
    vi.mocked(prisma.user.findMany).mockResolvedValue([...mockUsers, mockPendingUser]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.users).toHaveLength(3);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      })
    );
  });

  it('includes user badges', async () => {
    vi.mocked(validateSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.users[0].badges).toHaveLength(1);
    expect(data.users[0].badges[0].badge.key).toBe('creator_1');
  });

  it('returns 500 on database error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(validateSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.user.findMany).mockRejectedValue(new Error('Database error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Laden der Benutzer');
    consoleSpy.mockRestore();
  });

  it('orders users by displayName', async () => {
    vi.mocked(validateSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers);

    await GET();

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { displayName: 'asc' },
      })
    );
  });

  it('limits badges to top 3 per user', async () => {
    vi.mocked(validateSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers);

    await GET();

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          badges: expect.objectContaining({
            take: 3,
          }),
        }),
      })
    );
  });
});
