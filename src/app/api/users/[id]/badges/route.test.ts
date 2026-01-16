import { NextRequest } from 'next/server';

import { BadgeCategory, BadgeRarity } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { validateSession } from '@/lib/auth/admin-validation';
import { getUserBadges } from '@/lib/badges/badge-service';
import { prisma } from '@/lib/db/prisma';

import { GET } from './route';

vi.mock('@/lib/auth/admin-validation', () => ({
  validateSession: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/badges/badge-service', () => ({
  getUserBadges: vi.fn(),
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
  status: 'APPROVED' as const,
};

const mockAdminSession = {
  userId: 'admin-1',
  username: 'admin',
  role: 'ADMIN' as const,
  status: 'APPROVED' as const,
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
    vi.mocked(validateSession).mockResolvedValue({
      error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) as never,
    });

    const response = await GET(createRequest(), createParams('user-1'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when user does not exist', async () => {
    vi.mocked(validateSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const response = await GET(createRequest(), createParams('nonexistent'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('User nicht gefunden');
  });

  it('returns user badges for authenticated user', async () => {
    vi.mocked(validateSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ status: 'APPROVED' } as never);
    vi.mocked(getUserBadges).mockResolvedValue(mockBadges);

    const response = await GET(createRequest(), createParams('user-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.badges).toHaveLength(2);
    expect(data.badges[0].badge.key).toBe('creator_1');
    expect(data.badges[1].badge.key).toBe('rater_10');
  });

  it('calls getUserBadges with correct user id', async () => {
    vi.mocked(validateSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ status: 'APPROVED' } as never);
    vi.mocked(getUserBadges).mockResolvedValue([]);

    await GET(createRequest(), createParams('specific-user-id'));

    expect(getUserBadges).toHaveBeenCalledWith('specific-user-id');
  });

  it('returns 404 for non-approved user when accessed by non-admin', async () => {
    vi.mocked(validateSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ status: 'PENDING' } as never);

    const response = await GET(createRequest(), createParams('pending-user'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('User nicht gefunden');
  });

  it('returns badges for non-approved user when accessed by admin', async () => {
    vi.mocked(validateSession).mockResolvedValue({ session: mockAdminSession });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ status: 'PENDING' } as never);
    vi.mocked(getUserBadges).mockResolvedValue(mockBadges);

    const response = await GET(createRequest(), createParams('pending-user'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.badges).toHaveLength(2);
  });

  it('returns empty array when user has no badges', async () => {
    vi.mocked(validateSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ status: 'APPROVED' } as never);
    vi.mocked(getUserBadges).mockResolvedValue([]);

    const response = await GET(createRequest(), createParams('user-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.badges).toEqual([]);
  });

  it('returns 500 on service error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(validateSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ status: 'APPROVED' } as never);
    vi.mocked(getUserBadges).mockRejectedValue(new Error('Service error'));

    const response = await GET(createRequest(), createParams('user-1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Laden der Badges');
    consoleSpy.mockRestore();
  });
});
