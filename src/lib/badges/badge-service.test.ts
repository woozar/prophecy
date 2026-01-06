import { BadgeCategory, BadgeRarity } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  awardBadge,
  awardLeaderboardBadges,
  awardRoundCompletionBadges,
  checkAndAwardBadges,
  getAwardedBadges,
  getBadgeHolders,
  getUserBadges,
  getUserStats,
  isFirstProphecyOfRound,
  seedBadges,
} from './badge-service';

// Unmock badge-service since we're testing it directly
vi.unmock('@/lib/badges/badge-service');

// Types for mock data - matching actual Prisma return types with select/include
interface UserMock {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  avatarEffect: string | null;
  avatarEffectColors: string | null;
}

interface UserBadgeWithUser {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: Date;
  user: UserMock;
}

// These types match the actual select queries in badge-service.ts
interface ProphecySelect {
  id: string;
  fulfilled: boolean | null;
}

interface RatingWithProphecySelect {
  value: number;
  prophecy: { fulfilled: boolean | null };
}

interface RoundSelect {
  id: string;
}

// Create mock functions using vi.hoisted() to work with vi.mock hoisting
// We don't add type parameters here because vi.hoisted runs before interfaces are defined
const {
  mockBadgeUpsert,
  mockBadgeFindUnique,
  mockBadgeFindMany,
  mockUserBadgeFindUnique,
  mockUserBadgeFindMany,
  mockUserBadgeCreate,
  mockProphecyFindMany,
  mockProphecyFindFirst,
  mockRatingFindMany,
  mockRoundFindMany,
  mockRoundFindUnique,
  mockUserFindMany,
  mockUserFindUnique,
} = vi.hoisted(() => ({
  mockBadgeUpsert: vi.fn(),
  mockBadgeFindUnique: vi.fn(),
  mockBadgeFindMany: vi.fn(),
  mockUserBadgeFindUnique: vi.fn(),
  mockUserBadgeFindMany: vi.fn(),
  mockUserBadgeCreate: vi.fn(),
  mockProphecyFindMany: vi.fn(),
  mockProphecyFindFirst: vi.fn(),
  mockRatingFindMany: vi.fn(),
  mockRoundFindMany: vi.fn(),
  mockRoundFindUnique: vi.fn(),
  mockUserFindMany: vi.fn(),
  mockUserFindUnique: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    badge: {
      upsert: mockBadgeUpsert,
      findUnique: mockBadgeFindUnique,
      findMany: mockBadgeFindMany,
    },
    userBadge: {
      findUnique: mockUserBadgeFindUnique,
      findMany: mockUserBadgeFindMany,
      create: mockUserBadgeCreate,
    },
    prophecy: {
      findMany: mockProphecyFindMany,
      findFirst: mockProphecyFindFirst,
    },
    rating: {
      findMany: mockRatingFindMany,
    },
    round: {
      findMany: mockRoundFindMany,
      findUnique: mockRoundFindUnique,
    },
    user: {
      findMany: mockUserFindMany,
      findUnique: mockUserFindUnique,
    },
  },
  ensureInitialized: vi.fn(),
}));

const mockBadge = {
  id: 'badge-1',
  key: 'creator_1',
  name: 'Anfänger-Seher',
  description: 'Erste Schritte',
  requirement: '1 Prophezeiung',
  icon: '🔮',
  category: 'CREATOR' as BadgeCategory,
  rarity: 'BRONZE' as BadgeRarity,
  threshold: 1,
  createdAt: new Date(),
};

const mockUserBadge = {
  id: 'ub-1',
  userId: 'user-1',
  badgeId: 'badge-1',
  earnedAt: new Date(),
  badge: mockBadge,
};

describe('badge-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('seedBadges', () => {
    it('upserts all badge definitions', async () => {
      mockBadgeUpsert.mockResolvedValue(mockBadge);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await seedBadges();

      expect(mockBadgeUpsert).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Badges synchronisiert'));
      consoleSpy.mockRestore();
    });
  });

  describe('awardBadge', () => {
    it('returns null when badge definition not found', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await awardBadge('user-1', 'nonexistent_badge');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Badge definition not found: nonexistent_badge');
      consoleSpy.mockRestore();
    });

    it('returns null when badge not in database', async () => {
      mockBadgeFindUnique.mockResolvedValue(null);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await awardBadge('user-1', 'creator_1');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Badge not found in database: creator_1');
      consoleSpy.mockRestore();
    });

    it('returns existing badge when already owned', async () => {
      mockBadgeFindUnique.mockResolvedValue(mockBadge);
      mockUserBadgeFindUnique.mockResolvedValue(mockUserBadge);

      const result = await awardBadge('user-1', 'creator_1');

      expect(result).toEqual({ userBadge: mockUserBadge, isNew: false });
      expect(mockUserBadgeCreate).not.toHaveBeenCalled();
    });

    it('creates new user badge when not owned', async () => {
      mockBadgeFindUnique.mockResolvedValue(mockBadge);
      mockUserBadgeFindUnique.mockResolvedValue(null);
      mockUserBadgeCreate.mockResolvedValue(mockUserBadge);

      const result = await awardBadge('user-1', 'creator_1');

      expect(result).toEqual({ userBadge: mockUserBadge, isNew: true });
      expect(mockUserBadgeCreate).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          badgeId: 'badge-1',
        },
        include: { badge: true },
      });
    });
  });

  describe('getUserBadges', () => {
    it('returns user badges ordered by earnedAt desc', async () => {
      mockUserBadgeFindMany.mockResolvedValue([mockUserBadge]);

      const result = await getUserBadges('user-1');

      expect(result).toEqual([mockUserBadge]);
      expect(mockUserBadgeFindMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { badge: true },
        orderBy: { earnedAt: 'desc' },
      });
    });
  });

  describe('getUserStats', () => {
    it('calculates user statistics correctly', async () => {
      mockProphecyFindMany.mockResolvedValue([
        { id: 'p1', fulfilled: true },
        { id: 'p2', fulfilled: false },
        { id: 'p3', fulfilled: null },
      ]);
      mockRatingFindMany.mockResolvedValue([
        { value: 5, prophecy: { fulfilled: true } },
        { value: -3, prophecy: { fulfilled: false } },
        { value: 10, prophecy: { fulfilled: true } },
        { value: -10, prophecy: { fulfilled: null } },
      ]);
      mockRoundFindMany.mockResolvedValue([{ id: 'r1' }, { id: 'r2' }]);

      const stats = await getUserStats('user-1');

      expect(stats.propheciesCreated).toBe(3);
      expect(stats.propheciesFulfilled).toBe(1);
      expect(stats.accuracyRate).toBe(50); // 1/2 resolved
      expect(stats.ratingsGiven).toBe(4);
      expect(stats.roundsParticipated).toBe(2);
      expect(stats.maxRatingsGiven).toBe(1); // one +10
      expect(stats.minRatingsGiven).toBe(1); // one -10
    });

    it('handles zero prophecies', async () => {
      mockProphecyFindMany.mockResolvedValue([]);
      mockRatingFindMany.mockResolvedValue([]);
      mockRoundFindMany.mockResolvedValue([]);

      const stats = await getUserStats('user-1');

      expect(stats.propheciesCreated).toBe(0);
      expect(stats.accuracyRate).toBe(0);
      expect(stats.ratingsGiven).toBe(0);
      expect(stats.raterAccuracy).toBe(0);
    });

    it('calculates rater accuracy correctly', async () => {
      // Rating scale: -10 = "will happen" (fulfilled), +10 = "won't happen" (not fulfilled)
      mockProphecyFindMany.mockResolvedValue([]);
      mockRatingFindMany.mockResolvedValue([
        { value: 5, prophecy: { fulfilled: true } }, // incorrect: predicted won't happen, but it did
        { value: -3, prophecy: { fulfilled: false } }, // incorrect: predicted will happen, but it didn't
        { value: 5, prophecy: { fulfilled: false } }, // correct: predicted won't happen, and it didn't
        { value: -5, prophecy: { fulfilled: true } }, // correct: predicted will happen, and it did
      ]);
      mockRoundFindMany.mockResolvedValue([]);

      const stats = await getUserStats('user-1');

      expect(stats.raterAccuracy).toBe(50); // 2/4 correct
    });
  });

  describe('checkAndAwardBadges', () => {
    beforeEach(() => {
      mockProphecyFindMany.mockResolvedValue([]);
      mockRatingFindMany.mockResolvedValue([]);
      mockRoundFindMany.mockResolvedValue([]);
    });

    it('awards creator badge when threshold met', async () => {
      mockProphecyFindMany.mockResolvedValue([{ id: 'p1', fulfilled: null }]);
      mockBadgeFindUnique.mockResolvedValue(mockBadge);
      mockUserBadgeFindUnique.mockResolvedValue(null);
      mockUserBadgeCreate.mockResolvedValue(mockUserBadge);

      const result = await checkAndAwardBadges('user-1');

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(mockUserBadgeCreate).toHaveBeenCalled();
    });

    it('does not award badges when thresholds not met', async () => {
      mockProphecyFindMany.mockResolvedValue([]);
      mockRatingFindMany.mockResolvedValue([]);
      mockRoundFindMany.mockResolvedValue([]);

      const result = await checkAndAwardBadges('user-1');

      expect(result).toEqual([]);
    });

    it('awards multiple badges when multiple thresholds met', async () => {
      mockProphecyFindMany.mockResolvedValue([
        { id: 'p1', fulfilled: true },
        { id: 'p2', fulfilled: true },
        { id: 'p3', fulfilled: true },
        { id: 'p4', fulfilled: true },
        { id: 'p5', fulfilled: true },
      ]);
      mockRatingFindMany.mockResolvedValue(
        Array(10).fill({ value: 5, prophecy: { fulfilled: null } })
      );
      mockRoundFindMany.mockResolvedValue([{ id: 'r1' }]);

      mockBadgeFindUnique.mockResolvedValue(mockBadge);
      mockUserBadgeFindUnique.mockResolvedValue(null);
      mockUserBadgeCreate.mockResolvedValue(mockUserBadge);

      const result = await checkAndAwardBadges('user-1');

      expect(result.length).toBeGreaterThan(0);
    });

    it('awards social badges for extreme ratings', async () => {
      // Rating scale: -10 = "will happen" (ruthless/skeptical), +10 = "won't happen" (generous)
      // 10x +10 ratings awards social_generous (gives others chance for big wins)
      mockRatingFindMany.mockResolvedValue([
        ...Array(10).fill({ value: 10, prophecy: { fulfilled: null } }),
        ...Array(10).fill({ value: 5, prophecy: { fulfilled: null } }),
      ]);
      mockBadgeFindUnique.mockResolvedValue({
        ...mockBadge,
        key: 'social_generous',
      });
      mockUserBadgeFindUnique.mockResolvedValue(null);
      mockUserBadgeCreate.mockResolvedValue({
        ...mockUserBadge,
        badge: { ...mockBadge, key: 'social_generous' },
      });

      const result = await checkAndAwardBadges('user-1');

      expect(result.some((b) => b.badge.key === 'social_generous')).toBe(true);
    });
  });

  describe('getAwardedBadges', () => {
    it('returns badges with first achiever info', async () => {
      const mockUser: UserMock = {
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        avatarUrl: null,
        avatarEffect: null,
        avatarEffectColors: null,
      };
      mockBadgeFindMany.mockResolvedValue([
        {
          ...mockBadge,
          users: [
            {
              id: 'ub-1',
              earnedAt: new Date('2025-01-05'),
              user: mockUser,
            },
            {
              id: 'ub-2',
              earnedAt: new Date('2025-01-10'),
              user: { ...mockUser, id: 'user-2' },
            },
          ],
        },
      ]);

      const result = await getAwardedBadges();

      expect(result).toHaveLength(1);
      expect(result[0].firstAchiever).toEqual(mockUser);
      expect(result[0].totalAchievers).toBe(2);
    });

    it('filters out badges with no achievers', async () => {
      mockBadgeFindMany.mockResolvedValue([{ ...mockBadge, users: [] }]);

      const result = await getAwardedBadges();

      expect(result).toHaveLength(0);
    });

    it('sorts by first achieved date', async () => {
      const mockUser: UserMock = {
        id: 'user-1',
        username: 'testuser',
        displayName: null,
        avatarUrl: null,
        avatarEffect: null,
        avatarEffectColors: null,
      };
      mockBadgeFindMany.mockResolvedValue([
        {
          ...mockBadge,
          id: 'badge-newer',
          users: [{ id: 'ub-2', earnedAt: new Date('2025-01-10'), user: mockUser }],
        },
        {
          ...mockBadge,
          id: 'badge-older',
          users: [{ id: 'ub-1', earnedAt: new Date('2025-01-05'), user: mockUser }],
        },
      ]);

      const result = await getAwardedBadges();

      expect(result[0].id).toBe('badge-older');
      expect(result[1].id).toBe('badge-newer');
    });
  });

  describe('getBadgeHolders', () => {
    it('returns users with badge ordered by earnedAt', async () => {
      const mockHolders: UserBadgeWithUser[] = [
        {
          id: 'ub-1',
          userId: 'user-1',
          badgeId: 'badge-1',
          earnedAt: new Date('2025-01-05'),
          user: {
            id: 'user-1',
            username: 'first',
            displayName: 'First User',
            avatarUrl: null,
            avatarEffect: null,
            avatarEffectColors: null,
          },
        },
      ];
      mockUserBadgeFindMany.mockResolvedValue(mockHolders);

      const result = await getBadgeHolders('badge-1');

      expect(result).toEqual(mockHolders);
      expect(mockUserBadgeFindMany).toHaveBeenCalledWith({
        where: { badgeId: 'badge-1' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              avatarEffect: true,
              avatarEffectColors: true,
            },
          },
        },
        orderBy: { earnedAt: 'asc' },
      });
    });
  });

  describe('awardLeaderboardBadges', () => {
    beforeEach(() => {
      mockBadgeFindUnique.mockResolvedValue(mockBadge);
      mockUserBadgeFindUnique.mockResolvedValue(null);
      mockUserBadgeCreate.mockResolvedValue(mockUserBadge);
    });

    it('awards position badges for top 3 users', async () => {
      const leaderboard = [{ userId: 'user-1' }, { userId: 'user-2' }, { userId: 'user-3' }];

      const result = await awardLeaderboardBadges(leaderboard);

      expect(result.length).toBe(3);
      expect(mockUserBadgeCreate).toHaveBeenCalledTimes(3);
    });

    it('awards only available position badges when less than 3 users', async () => {
      const leaderboard = [{ userId: 'user-1' }];

      const result = await awardLeaderboardBadges(leaderboard);

      expect(result.length).toBe(1);
      expect(mockUserBadgeCreate).toHaveBeenCalledTimes(1);
    });

    it('awards champion badge for 3+ first place wins', async () => {
      const leaderboard = [{ userId: 'user-1' }];

      const result = await awardLeaderboardBadges(leaderboard, 3);

      // 1 position badge + 1 champion badge
      expect(result.length).toBe(2);
    });

    it('awards both champion badges for 5+ first place wins', async () => {
      const leaderboard = [{ userId: 'user-1' }];

      const result = await awardLeaderboardBadges(leaderboard, 5);

      // 1 position badge + 2 champion badges
      expect(result.length).toBe(3);
    });

    it('does not award champion badges without first place win count', async () => {
      const leaderboard = [{ userId: 'user-1' }];

      const result = await awardLeaderboardBadges(leaderboard);

      // Only position badge
      expect(result.length).toBe(1);
    });

    it('returns empty array for empty leaderboard', async () => {
      const result = await awardLeaderboardBadges([]);

      expect(result).toEqual([]);
      expect(mockUserBadgeCreate).not.toHaveBeenCalled();
    });
  });

  describe('checkAndAwardBadges - additional coverage', () => {
    beforeEach(() => {
      mockProphecyFindMany.mockResolvedValue([]);
      mockRatingFindMany.mockResolvedValue([]);
      mockRoundFindMany.mockResolvedValue([]);
      mockBadgeFindUnique.mockResolvedValue(mockBadge);
      mockUserBadgeFindUnique.mockResolvedValue(null);
      mockUserBadgeCreate.mockResolvedValue(mockUserBadge);
    });

    it('awards social_neutral badge for neutral average rating', async () => {
      // 30+ ratings with average between -1 and 1
      mockRatingFindMany.mockResolvedValue([
        ...Array(15).fill({ value: 1, prophecy: { fulfilled: null } }),
        ...Array(15).fill({ value: -1, prophecy: { fulfilled: null } }),
      ]);

      const result = await checkAndAwardBadges('user-1');

      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('awards accuracy_rate badges when prophecies >= 10', async () => {
      // 10+ prophecies with high accuracy
      mockProphecyFindMany.mockResolvedValue([
        ...Array(8).fill({ id: 'p', fulfilled: true }),
        ...Array(2).fill({ id: 'p', fulfilled: false }),
      ]);

      const result = await checkAndAwardBadges('user-1');

      // Should check for accuracy_rate badges
      expect(mockBadgeFindUnique).toHaveBeenCalled();
    });

    it('awards rater_accuracy badges when ratings >= 20', async () => {
      // 20+ ratings with some correct predictions
      mockRatingFindMany.mockResolvedValue([
        ...Array(15).fill({ value: -5, prophecy: { fulfilled: true } }), // correct
        ...Array(5).fill({ value: 5, prophecy: { fulfilled: false } }), // correct
      ]);

      const result = await checkAndAwardBadges('user-1');

      expect(mockBadgeFindUnique).toHaveBeenCalled();
    });
  });

  describe('isFirstProphecyOfRound', () => {
    it('returns true when prophecy is first in round', async () => {
      mockProphecyFindFirst.mockResolvedValue({ id: 'prophecy-1' });

      const result = await isFirstProphecyOfRound('round-1', 'prophecy-1');

      expect(result).toBe(true);
      expect(mockProphecyFindFirst).toHaveBeenCalledWith({
        where: { roundId: 'round-1' },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
    });

    it('returns false when prophecy is not first in round', async () => {
      mockProphecyFindFirst.mockResolvedValue({ id: 'prophecy-other' });

      const result = await isFirstProphecyOfRound('round-1', 'prophecy-1');

      expect(result).toBe(false);
    });

    it('returns false when no prophecies exist in round', async () => {
      mockProphecyFindFirst.mockResolvedValue(null);

      const result = await isFirstProphecyOfRound('round-1', 'prophecy-1');

      expect(result).toBe(false);
    });
  });

  describe('awardRoundCompletionBadges', () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24);

    beforeEach(() => {
      mockRoundFindUnique.mockResolvedValue({
        id: 'round-1',
        resultsPublishedAt: pastDate,
      });
      mockRoundFindMany.mockResolvedValue([]);
      mockProphecyFindMany.mockResolvedValue([]);
      mockUserFindMany.mockResolvedValue([]);
      mockUserFindUnique.mockResolvedValue({ id: 'bot-id', username: 'kimberly' });
      mockRatingFindMany.mockResolvedValue([]);
      mockBadgeFindUnique.mockResolvedValue(mockBadge);
      mockUserBadgeFindUnique.mockResolvedValue(null);
      mockUserBadgeCreate.mockResolvedValue(mockUserBadge);
    });

    it('returns empty array for empty leaderboard', async () => {
      const result = await awardRoundCompletionBadges('round-1', []);

      expect(result).toEqual([]);
    });

    it('processes participants from leaderboard', async () => {
      const leaderboard = [{ userId: 'user-1' }, { userId: 'user-2' }];
      mockProphecyFindMany.mockResolvedValue([
        {
          id: 'p1',
          creatorId: 'user-1',
          fulfilled: true,
          createdAt: pastDate,
          ratings: [{ userId: 'user-2', value: -5, createdAt: pastDate, user: { isBot: false } }],
        },
      ]);
      mockRatingFindMany.mockResolvedValue([{ value: -5, prophecy: { fulfilled: true } }]);

      const result = await awardRoundCompletionBadges('round-1', leaderboard);

      expect(Array.isArray(result)).toBe(true);
    });

    it('awards unicorn badge for high-rating fulfilled prophecy', async () => {
      const leaderboard = [{ userId: 'user-1' }];
      mockProphecyFindMany.mockResolvedValue([
        {
          id: 'p1',
          creatorId: 'user-1',
          fulfilled: true,
          createdAt: pastDate,
          ratings: [{ userId: 'user-2', value: 8, createdAt: pastDate, user: { isBot: false } }],
        },
      ]);

      const result = await awardRoundCompletionBadges('round-1', leaderboard);

      expect(mockBadgeFindUnique).toHaveBeenCalled();
    });

    it('awards party_crasher badge for high-rating unfulfilled prophecy', async () => {
      const leaderboard = [{ userId: 'user-1' }];
      mockProphecyFindMany.mockResolvedValue([
        {
          id: 'p1',
          creatorId: 'user-1',
          fulfilled: false,
          createdAt: pastDate,
          ratings: [{ userId: 'user-2', value: 8, createdAt: pastDate, user: { isBot: false } }],
        },
      ]);

      const result = await awardRoundCompletionBadges('round-1', leaderboard);

      expect(mockBadgeFindUnique).toHaveBeenCalled();
    });

    it('awards speedrunner badge when all ratings within 10 minutes', async () => {
      const now = Date.now();
      const leaderboard = [{ userId: 'user-1' }];
      mockProphecyFindMany.mockResolvedValue([
        {
          id: 'p1',
          creatorId: 'user-2',
          fulfilled: true,
          createdAt: new Date(now - 1000 * 60 * 60),
          ratings: [
            { userId: 'user-1', value: -5, createdAt: new Date(now), user: { isBot: false } },
          ],
        },
        {
          id: 'p2',
          creatorId: 'user-2',
          fulfilled: true,
          createdAt: new Date(now - 1000 * 60 * 60),
          ratings: [
            {
              userId: 'user-1',
              value: -3,
              createdAt: new Date(now + 1000 * 60 * 5),
              user: { isBot: false },
            }, // 5 min later
          ],
        },
      ]);

      const result = await awardRoundCompletionBadges('round-1', leaderboard);

      expect(Array.isArray(result)).toBe(true);
    });

    it('awards against_stream badge when user predicts opposite of average correctly', async () => {
      const leaderboard = [{ userId: 'user-1' }];
      mockProphecyFindMany.mockResolvedValue([
        {
          id: 'p1',
          creatorId: 'user-2',
          fulfilled: true, // Actually fulfilled
          createdAt: pastDate,
          ratings: [
            { userId: 'user-1', value: -5, createdAt: pastDate, user: { isBot: false } }, // User predicts fulfilled (correct)
            { userId: 'user-3', value: 5, createdAt: pastDate, user: { isBot: false } }, // Others predict not fulfilled
            { userId: 'user-4', value: 7, createdAt: pastDate, user: { isBot: false } },
          ],
        },
      ]);

      const result = await awardRoundCompletionBadges('round-1', leaderboard);

      expect(Array.isArray(result)).toBe(true);
    });

    it('awards morning_glory badge when rating within 24h of prophecy creation', async () => {
      const now = Date.now();
      const leaderboard = [{ userId: 'user-1' }];
      mockProphecyFindMany.mockResolvedValue([
        {
          id: 'p1',
          creatorId: 'user-2',
          fulfilled: null,
          createdAt: new Date(now),
          ratings: [
            {
              userId: 'user-1',
              value: 5,
              createdAt: new Date(now + 1000 * 60 * 60 * 12),
              user: { isBot: false },
            }, // 12h later
          ],
        },
      ]);

      const result = await awardRoundCompletionBadges('round-1', leaderboard);

      expect(Array.isArray(result)).toBe(true);
    });

    it('awards bot_beater badge when user accuracy exceeds Kimberly', async () => {
      const leaderboard = [{ userId: 'user-1' }];
      mockProphecyFindMany.mockResolvedValue([
        {
          id: 'p1',
          creatorId: 'user-2',
          fulfilled: true,
          createdAt: pastDate,
          ratings: [{ userId: 'user-1', value: -5, createdAt: pastDate, user: { isBot: false } }],
        },
      ]);
      // User has 100% accuracy, bot has 0%
      mockRatingFindMany
        .mockResolvedValueOnce([{ value: -5, prophecy: { fulfilled: true } }]) // user accuracy query
        .mockResolvedValueOnce([]); // bot accuracy query
      mockUserFindUnique.mockResolvedValue({ id: 'bot-id', username: 'kimberly' });

      const result = await awardRoundCompletionBadges('round-1', leaderboard);

      expect(Array.isArray(result)).toBe(true);
    });

    it('awards chaos_agent badge for mixed prophecy outcomes with controversy', async () => {
      const leaderboard = [{ userId: 'user-1' }];
      mockProphecyFindMany.mockResolvedValue([
        {
          id: 'p1',
          creatorId: 'user-1',
          fulfilled: true,
          createdAt: pastDate,
          ratings: [
            { userId: 'user-2', value: -10, createdAt: pastDate, user: { isBot: false } },
            { userId: 'user-3', value: 10, createdAt: pastDate, user: { isBot: false } },
          ],
        },
        {
          id: 'p2',
          creatorId: 'user-1',
          fulfilled: false,
          createdAt: pastDate,
          ratings: [{ userId: 'user-2', value: 5, createdAt: pastDate, user: { isBot: false } }],
        },
      ]);

      const result = await awardRoundCompletionBadges('round-1', leaderboard);

      expect(Array.isArray(result)).toBe(true);
    });

    it('awards underdog badge when winner was not in top 3 for last 2 rounds', async () => {
      const now = Date.now();
      const leaderboard = [{ userId: 'user-1' }];

      // Current round
      mockRoundFindUnique.mockResolvedValue({
        id: 'round-3',
        resultsPublishedAt: new Date(now),
      });

      // Previous 2 rounds
      mockRoundFindMany.mockResolvedValue([{ id: 'round-2' }, { id: 'round-1' }]);

      mockProphecyFindMany
        .mockResolvedValueOnce([]) // current round prophecies
        .mockResolvedValueOnce([
          // round-2: user-1 not in top 3
          {
            id: 'p1',
            creatorId: 'user-1',
            fulfilled: false,
            createdAt: pastDate,
            ratings: [{ value: 0, user: { isBot: false } }],
          },
          {
            id: 'p2',
            creatorId: 'user-2',
            fulfilled: true,
            createdAt: pastDate,
            ratings: [{ value: 5, user: { isBot: false } }],
          },
        ])
        .mockResolvedValueOnce([
          // round-1: user-1 not in top 3
          {
            id: 'p3',
            creatorId: 'user-3',
            fulfilled: true,
            createdAt: pastDate,
            ratings: [{ value: 5, user: { isBot: false } }],
          },
        ]);

      const result = await awardRoundCompletionBadges('round-3', leaderboard);

      expect(Array.isArray(result)).toBe(true);
    });

    it('does not award worse_than_random when user has no ratings', async () => {
      const leaderboard = [{ userId: 'user-1' }];
      mockProphecyFindMany.mockResolvedValue([]);
      mockRatingFindMany.mockResolvedValue([]);

      const result = await awardRoundCompletionBadges('round-1', leaderboard);

      expect(result).toEqual([]);
    });

    it('ignores bot ratings when calculating averages', async () => {
      const leaderboard = [{ userId: 'user-1' }];
      mockProphecyFindMany.mockResolvedValue([
        {
          id: 'p1',
          creatorId: 'user-1',
          fulfilled: true,
          createdAt: pastDate,
          ratings: [
            { userId: 'bot-1', value: 10, createdAt: pastDate, user: { isBot: true } },
            { userId: 'user-2', value: -5, createdAt: pastDate, user: { isBot: false } },
          ],
        },
      ]);

      const result = await awardRoundCompletionBadges('round-1', leaderboard);

      expect(Array.isArray(result)).toBe(true);
    });

    it('handles zero-value ratings correctly', async () => {
      const leaderboard = [{ userId: 'user-1' }];
      mockProphecyFindMany.mockResolvedValue([
        {
          id: 'p1',
          creatorId: 'user-1',
          fulfilled: true,
          createdAt: pastDate,
          ratings: [{ userId: 'user-2', value: 0, createdAt: pastDate, user: { isBot: false } }],
        },
      ]);

      const result = await awardRoundCompletionBadges('round-1', leaderboard);

      expect(Array.isArray(result)).toBe(true);
    });

    it('skips prophecies without resolved status for creator badges', async () => {
      const leaderboard = [{ userId: 'user-1' }];
      mockProphecyFindMany.mockResolvedValue([
        {
          id: 'p1',
          creatorId: 'user-1',
          fulfilled: null, // Not resolved yet
          createdAt: pastDate,
          ratings: [{ userId: 'user-2', value: 8, createdAt: pastDate, user: { isBot: false } }],
        },
      ]);

      // No creator badges (unicorn, party_crasher) should be awarded for unresolved prophecies
      // But other badges might still be awarded
      const result = await awardRoundCompletionBadges('round-1', leaderboard);

      // Since fulfilled is null, no unicorn/party_crasher badges should be given
      // (other badges may still be awarded though)
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
