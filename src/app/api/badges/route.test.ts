import { BadgeCategory, BadgeRarity } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

import { GET } from './route';

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

describe('GET /api/badges', () => {
  const mockSession = {
    userId: 'user-1',
    username: 'testuser',
    role: 'USER' as const,
    iat: Date.now(),
  };

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
    {
      id: 'badge-2',
      key: 'creator_5',
      name: 'Mondleser',
      description: 'Die Sterne sprechen',
      requirement: '5 Prophezeiungen erstellt',
      icon: '🌙',
      category: BadgeCategory.CREATOR,
      rarity: BadgeRarity.SILVER,
      threshold: 5,
      createdAt: new Date('2025-01-01'),
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

  it('returns all badges for authenticated user', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.badge.findMany).mockResolvedValue(mockBadges);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.badges).toHaveLength(2);
    expect(data.badges[0].key).toBe('creator_1');
    expect(data.badges[1].key).toBe('creator_5');
  });

  it('orders badges by category, rarity, and threshold', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.badge.findMany).mockResolvedValue(mockBadges);

    await GET();

    expect(prisma.badge.findMany).toHaveBeenCalledWith({
      orderBy: [{ category: 'asc' }, { rarity: 'asc' }, { threshold: 'asc' }],
    });
  });

  it('returns 500 on database error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.badge.findMany).mockRejectedValue(new Error('DB error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Laden der Badges');
    consoleSpy.mockRestore();
  });
});
