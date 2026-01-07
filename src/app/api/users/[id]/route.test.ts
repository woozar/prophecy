import { NextRequest } from 'next/server';

import { BadgeCategory, BadgeRarity } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSession } from '@/lib/auth/session';
import { getUserStats } from '@/lib/badges/badge-service';
import { prisma } from '@/lib/db/prisma';

import { GET } from './route';

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/badges/badge-service', () => ({
  getUserStats: vi.fn(),
}));

const mockSession = {
  userId: 'user-1',
  username: 'testuser',
  role: 'USER' as const,
  iat: Date.now(),
};

const mockAdminSession = {
  userId: 'admin-1',
  username: 'admin',
  role: 'ADMIN' as const,
  iat: Date.now(),
};

const mockUser = {
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
        description: 'Erste Schritte',
        icon: '🔮',
        category: BadgeCategory.CREATOR,
        rarity: BadgeRarity.BRONZE,
      },
    },
  ],
};

const mockStats = {
  propheciesCreated: 5,
  propheciesFulfilled: 3,
  accuracyRate: 60,
  ratingsGiven: 10,
  ratingsOnResolved: 8,
  raterAccuracy: 70,
  roundsParticipated: 2,
  leaderboardWins: 1,
  leaderboardSecond: 0,
  leaderboardThird: 0,
  averageRatingGiven: 3.5,
  maxRatingsGiven: 2,
  minRatingsGiven: 1,
};

const createRequest = () => new NextRequest('http://localhost/api/users/user-1');
const createParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe('GET /api/users/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const response = await GET(createRequest(), createParams('user-1'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when user does not exist', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const response = await GET(createRequest(), createParams('nonexistent'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('User nicht gefunden');
  });

  it('returns user profile with badges and stats', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(getUserStats).mockResolvedValue(mockStats);

    const response = await GET(createRequest(), createParams('user-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.id).toBe('user-1');
    expect(data.user.username).toBe('testuser');
    expect(data.user.badges).toHaveLength(1);
    expect(data.user.stats).toEqual(mockStats);
  });

  it('calls getUserStats with correct user id', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(getUserStats).mockResolvedValue(mockStats);

    await GET(createRequest(), createParams('specific-user-id'));

    expect(getUserStats).toHaveBeenCalledWith('specific-user-id');
  });

  it('returns 404 for non-approved user when accessed by non-admin', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...mockUser,
      status: 'PENDING',
    });

    const response = await GET(createRequest(), createParams('pending-user'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('User nicht gefunden');
  });

  it('returns non-approved user for admin', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdminSession);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...mockUser,
      status: 'PENDING',
    });
    vi.mocked(getUserStats).mockResolvedValue(mockStats);

    const response = await GET(createRequest(), createParams('pending-user'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.status).toBe('PENDING');
  });

  it('returns 500 on database error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'));

    const response = await GET(createRequest(), createParams('user-1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Laden des Users');
    consoleSpy.mockRestore();
  });

  it('includes user stats in response', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(getUserStats).mockResolvedValue(mockStats);

    const response = await GET(createRequest(), createParams('user-1'));
    const data = await response.json();

    expect(data.user.stats.propheciesCreated).toBe(5);
    expect(data.user.stats.ratingsGiven).toBe(10);
  });
});
