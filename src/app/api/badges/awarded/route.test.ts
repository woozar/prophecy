import { BadgeCategory, BadgeRarity } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSession } from '@/lib/auth/session';
import { getAwardedBadges } from '@/lib/badges/badge-service';

import { GET } from './route';

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/badges/badge-service', () => ({
  getAwardedBadges: vi.fn(),
}));

describe('GET /api/badges/awarded', () => {
  const mockSession = {
    userId: 'user-1',
    username: 'testuser',
    role: 'USER' as const,
    iat: Date.now(),
  };

  const mockAwardedBadges = [
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
      users: [],
      firstAchiever: {
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        avatarUrl: null,
        avatarEffect: null,
        avatarEffectColors: null,
      },
      firstAchievedAt: new Date('2025-01-05'),
      totalAchievers: 3,
    },
  ];

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

  it('returns awarded badges for authenticated user', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(getAwardedBadges).mockResolvedValue(mockAwardedBadges);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.badges).toHaveLength(1);
    expect(data.badges[0].key).toBe('creator_1');
    expect(data.badges[0].totalAchievers).toBe(3);
  });

  it('returns empty array when no badges awarded', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(getAwardedBadges).mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.badges).toEqual([]);
  });

  it('returns 500 on service error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(getAwardedBadges).mockRejectedValue(new Error('Service error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Laden der vergebenen Badges');
    consoleSpy.mockRestore();
  });
});
