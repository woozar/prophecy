import { NextRequest } from 'next/server';

import { BadgeCategory, BadgeRarity } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

// Create mock functions using vi.hoisted() to work with vi.mock hoisting
const { mockGetSession, mockUserFindUnique, mockGetUserBadges } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockGetUserBadges: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  getSession: mockGetSession,
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
    },
  },
}));

vi.mock('@/lib/badges/badge-service', () => ({
  getUserBadges: mockGetUserBadges,
}));

// Type for getUserBadges result - matching actual Prisma return type
interface UserBadgeWithBadge {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: Date;
  badge: {
    id: string;
    key: string;
    name: string;
    description: string;
    requirement: string;
    icon: string;
    category: BadgeCategory;
    rarity: BadgeRarity;
    threshold: number | null;
    createdAt: Date;
  };
}

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

const mockBadges: UserBadgeWithBadge[] = [
  {
    id: 'ub-1',
    userId: 'user-1',
    badgeId: 'badge-1',
    earnedAt: new Date('2025-01-05'),
    badge: {
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
  },
  {
    id: 'ub-2',
    userId: 'user-1',
    badgeId: 'badge-2',
    earnedAt: new Date('2025-01-10'),
    badge: {
      id: 'badge-2',
      key: 'rater_10',
      name: 'Kritiker',
      description: 'Du hast eine Meinung',
      requirement: '10 Bewertungen abgegeben',
      icon: '⚖️',
      category: BadgeCategory.RATER,
      rarity: BadgeRarity.BRONZE,
      threshold: 10,
      createdAt: new Date('2025-01-01'),
    },
  },
];

const createRequest = () => new NextRequest('http://localhost/api/users/user-1/badges');
const createParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe('GET /api/users/[id]/badges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await GET(createRequest(), createParams('user-1'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when user does not exist', async () => {
    mockGetSession.mockResolvedValue(mockSession);
    mockUserFindUnique.mockResolvedValue(null);

    const response = await GET(createRequest(), createParams('nonexistent'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('User nicht gefunden');
  });

  it('returns user badges for authenticated user', async () => {
    mockGetSession.mockResolvedValue(mockSession);
    mockUserFindUnique.mockResolvedValue({ status: 'APPROVED' });
    mockGetUserBadges.mockResolvedValue(mockBadges);

    const response = await GET(createRequest(), createParams('user-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.badges).toHaveLength(2);
    expect(data.badges[0].badge.key).toBe('creator_1');
    expect(data.badges[1].badge.key).toBe('rater_10');
  });

  it('calls getUserBadges with correct user id', async () => {
    mockGetSession.mockResolvedValue(mockSession);
    mockUserFindUnique.mockResolvedValue({ status: 'APPROVED' });
    mockGetUserBadges.mockResolvedValue([]);

    await GET(createRequest(), createParams('specific-user-id'));

    expect(mockGetUserBadges).toHaveBeenCalledWith('specific-user-id');
  });

  it('returns 404 for non-approved user when accessed by non-admin', async () => {
    mockGetSession.mockResolvedValue(mockSession);
    mockUserFindUnique.mockResolvedValue({ status: 'PENDING' });

    const response = await GET(createRequest(), createParams('pending-user'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('User nicht gefunden');
  });

  it('returns badges for non-approved user when accessed by admin', async () => {
    mockGetSession.mockResolvedValue(mockAdminSession);
    mockUserFindUnique.mockResolvedValue({ status: 'PENDING' });
    mockGetUserBadges.mockResolvedValue(mockBadges);

    const response = await GET(createRequest(), createParams('pending-user'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.badges).toHaveLength(2);
  });

  it('returns empty array when user has no badges', async () => {
    mockGetSession.mockResolvedValue(mockSession);
    mockUserFindUnique.mockResolvedValue({ status: 'APPROVED' });
    mockGetUserBadges.mockResolvedValue([]);

    const response = await GET(createRequest(), createParams('user-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.badges).toEqual([]);
  });

  it('returns 500 on service error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetSession.mockResolvedValue(mockSession);
    mockUserFindUnique.mockResolvedValue({ status: 'APPROVED' });
    mockGetUserBadges.mockRejectedValue(new Error('Service error'));

    const response = await GET(createRequest(), createParams('user-1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Laden der Badges');
    consoleSpy.mockRestore();
  });
});
