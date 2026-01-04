import { BadgeCategory, BadgeRarity } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

import { GET } from './route';

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

describe('GET /api/initial-data', () => {
  const mockSession = {
    userId: 'user-1',
    username: 'testuser1',
    role: 'USER' as const,
    iat: Date.now(),
  };

  const mockUsers = [
    {
      id: 'user-1',
      username: 'testuser1',
      displayName: 'Test User 1',
      passwordHash: null,
      forcePasswordChange: false,
      avatarUrl: null,
      avatarEffect: null,
      avatarEffectColors: null,
      role: 'USER',
      status: 'APPROVED',
      isBot: false,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      _count: { prophecies: 2, ratings: 5 },
    },
    {
      id: 'user-2',
      username: 'testuser2',
      displayName: 'Test User 2',
      passwordHash: null,
      forcePasswordChange: false,
      avatarUrl: '/api/uploads/avatars/test.webp',
      avatarEffect: 'glow',
      avatarEffectColors: '["cyan","teal"]',
      role: 'ADMIN',
      status: 'APPROVED',
      isBot: false,
      createdAt: new Date('2025-01-02'),
      updatedAt: new Date('2025-01-02'),
      _count: { prophecies: 3, ratings: 10 },
    },
  ];

  const mockBadges = [
    {
      id: 'badge-1',
      key: 'creator_1',
      name: 'Anfänger-Seher',
      description: 'Erste Schritte',
      requirement: '1 Prophezeiung erstellt',
      icon: '🔮',
      category: BadgeCategory.CREATOR,
      rarity: BadgeRarity.BRONZE,
      threshold: 1,
      createdAt: new Date('2025-01-01'),
    },
  ];

  const mockMyBadges = [
    {
      id: 'user-badge-1',
      userId: 'user-1',
      badgeId: 'badge-1',
      earnedAt: new Date('2025-01-05'),
      badge: mockBadges[0],
    },
  ];

  const mockAllUserBadges = [
    {
      id: 'user-badge-1',
      userId: 'user-1',
      badgeId: 'badge-1',
      earnedAt: new Date('2025-01-05'),
    },
  ];

  const mockRounds = [
    {
      id: 'round-1',
      title: 'Round 1',
      submissionDeadline: new Date('2025-02-01'),
      ratingDeadline: new Date('2025-02-15'),
      fulfillmentDate: new Date('2025-03-01'),
      resultsPublishedAt: null,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      _count: { prophecies: 5 },
    },
  ];

  const mockProphecies = [
    {
      id: 'prophecy-1',
      title: 'Test Prophecy',
      description: 'Description',
      creatorId: 'user-1',
      roundId: 'round-1',
      createdAt: new Date('2025-01-05'),
      updatedAt: new Date('2025-01-05'),
      fulfilled: null,
      resolvedAt: null,
      averageRating: null,
      ratingCount: 0,
    },
    {
      id: 'prophecy-2',
      title: 'Fulfilled Prophecy',
      description: 'Description 2',
      creatorId: 'user-2',
      roundId: 'round-1',
      createdAt: new Date('2025-01-06'),
      updatedAt: new Date('2025-02-20'),
      fulfilled: true,
      resolvedAt: new Date('2025-02-20'),
      averageRating: 4.5,
      ratingCount: 10,
    },
  ];

  const mockRatings = [
    {
      id: 'rating-1',
      value: 4,
      prophecyId: 'prophecy-1',
      userId: 'user-2',
      createdAt: new Date('2025-01-10'),
      updatedAt: new Date('2025-01-10'),
    },
  ];

  // Helper to set up all required mocks
  const setupMocks = (overrides?: {
    users?: typeof mockUsers;
    rounds?: typeof mockRounds;
    prophecies?: typeof mockProphecies;
    ratings?: typeof mockRatings;
    badges?: typeof mockBadges;
    myBadges?: typeof mockMyBadges;
    allUserBadges?: typeof mockAllUserBadges;
  }) => {
    vi.mocked(prisma.user.findMany).mockResolvedValue(overrides?.users ?? mockUsers);
    vi.mocked(prisma.round.findMany).mockResolvedValue(overrides?.rounds ?? mockRounds);
    vi.mocked(prisma.prophecy.findMany).mockResolvedValue(overrides?.prophecies ?? mockProphecies);
    vi.mocked(prisma.rating.findMany).mockResolvedValue(overrides?.ratings ?? mockRatings);
    vi.mocked(prisma.badge.findMany).mockResolvedValue(overrides?.badges ?? mockBadges);
    vi.mocked(prisma.userBadge.findMany)
      .mockResolvedValueOnce(overrides?.myBadges ?? mockMyBadges)
      .mockResolvedValueOnce(overrides?.allUserBadges ?? mockAllUserBadges);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Nicht autorisiert');
  });

  it('returns all data for authenticated user', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    setupMocks();

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.currentUserId).toBe('user-1');
    expect(data.users).toHaveLength(2);
    expect(data.rounds).toHaveLength(1);
    expect(data.prophecies).toHaveLength(2);
    expect(data.ratings).toHaveLength(1);
    expect(data.badges).toHaveLength(1);
    expect(data.myBadges).toHaveLength(1);
    expect(data.allUserBadges).toHaveLength(1);
  });

  it('transforms dates to ISO strings', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    setupMocks();

    const response = await GET();
    const data = await response.json();

    // Check user dates
    expect(data.users[0].createdAt).toBe('2025-01-01T00:00:00.000Z');

    // Check round dates
    expect(data.rounds[0].submissionDeadline).toBe('2025-02-01T00:00:00.000Z');
    expect(data.rounds[0].ratingDeadline).toBe('2025-02-15T00:00:00.000Z');
    expect(data.rounds[0].fulfillmentDate).toBe('2025-03-01T00:00:00.000Z');
    expect(data.rounds[0].createdAt).toBe('2025-01-01T00:00:00.000Z');

    // Check prophecy dates
    expect(data.prophecies[0].createdAt).toBe('2025-01-05T00:00:00.000Z');
    expect(data.prophecies[0].resolvedAt).toBeNull();
    expect(data.prophecies[1].resolvedAt).toBe('2025-02-20T00:00:00.000Z');

    // Check rating dates
    expect(data.ratings[0].createdAt).toBe('2025-01-10T00:00:00.000Z');

    // Check badge dates
    expect(data.badges[0].createdAt).toBe('2025-01-01T00:00:00.000Z');
    expect(data.myBadges[0].earnedAt).toBe('2025-01-05T00:00:00.000Z');
    expect(data.allUserBadges[0].earnedAt).toBe('2025-01-05T00:00:00.000Z');
  });

  it('parses avatarEffectColors JSON string', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    setupMocks({ rounds: [], prophecies: [], ratings: [] });

    const response = await GET();
    const data = await response.json();

    // User without colors
    expect(data.users[0].avatarEffectColors).toBeUndefined();

    // User with colors
    expect(data.users[1].avatarEffectColors).toEqual(['cyan', 'teal']);
  });

  it('includes prophecy count in rounds', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    setupMocks({ users: [], prophecies: [], ratings: [] });

    const response = await GET();
    const data = await response.json();

    expect(data.rounds[0]._count.prophecies).toBe(5);
  });

  it('includes user badge ids from allUserBadges', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    setupMocks();

    const response = await GET();
    const data = await response.json();

    // User 1 has badge-1
    expect(data.users[0].badgeIds).toEqual(['badge-1']);
    // User 2 has no badges
    expect(data.users[1].badgeIds).toEqual([]);
  });

  it('only fetches approved users for non-admin', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    setupMocks({ users: [], rounds: [], prophecies: [], ratings: [] });

    await GET();

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { status: 'APPROVED' },
      select: expect.objectContaining({
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        avatarEffect: true,
        avatarEffectColors: true,
        role: true,
        status: true,
        isBot: true,
        createdAt: true,
        _count: expect.any(Object),
      }),
    });
  });

  it('fetches all users for admin', async () => {
    const adminSession = { ...mockSession, role: 'ADMIN' as const };
    vi.mocked(getSession).mockResolvedValue(adminSession);
    setupMocks({ users: [], rounds: [], prophecies: [], ratings: [] });

    await GET();

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {},
      select: expect.objectContaining({
        id: true,
        username: true,
      }),
    });
  });

  it('fetches rounds ordered by createdAt descending', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    setupMocks({ users: [], rounds: [], prophecies: [], ratings: [] });

    await GET();

    expect(prisma.round.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { prophecies: true },
        },
      },
    });
  });
});
