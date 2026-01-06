import type { BadgeCategory, BadgeRarity } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import type { Badge } from '@/store/useBadgeStore';

import {
  getHighestTierBadge,
  getTierGroupKey,
  groupBadgesByTier,
  isTierGroupAscending,
  sortTierBadges,
} from './badge-tiers';

const createBadge = (
  key: string,
  threshold: number | null = null,
  category: BadgeCategory = 'CREATOR',
  rarity: BadgeRarity = 'BRONZE'
): Badge => ({
  id: key,
  key,
  name: `Badge ${key}`,
  description: `Description for ${key}`,
  requirement: `Requirement for ${key}`,
  category,
  rarity,
  threshold,
  createdAt: new Date().toISOString(),
});

describe('badge-tiers', () => {
  describe('getTierGroupKey', () => {
    it('returns prefix for creator badges', () => {
      expect(getTierGroupKey('creator_1')).toBe('creator_');
      expect(getTierGroupKey('creator_100')).toBe('creator_');
    });

    it('returns prefix for fulfilled badges', () => {
      expect(getTierGroupKey('fulfilled_5')).toBe('fulfilled_');
      expect(getTierGroupKey('fulfilled_50')).toBe('fulfilled_');
    });

    it('returns prefix for accuracy_rate badges', () => {
      expect(getTierGroupKey('accuracy_rate_60')).toBe('accuracy_rate_');
      expect(getTierGroupKey('accuracy_rate_90')).toBe('accuracy_rate_');
    });

    it('returns prefix for rater badges (not rater_accuracy)', () => {
      expect(getTierGroupKey('rater_10')).toBe('rater_');
      expect(getTierGroupKey('rater_300')).toBe('rater_');
    });

    it('returns prefix for rater_accuracy badges', () => {
      expect(getTierGroupKey('rater_accuracy_60')).toBe('rater_accuracy_');
      expect(getTierGroupKey('rater_accuracy_90')).toBe('rater_accuracy_');
    });

    it('returns prefix for rounds badges', () => {
      expect(getTierGroupKey('rounds_1')).toBe('rounds_');
      expect(getTierGroupKey('rounds_50')).toBe('rounds_');
    });

    it('returns prefix for leaderboard position badges', () => {
      expect(getTierGroupKey('leaderboard_1')).toBe('leaderboard_');
      expect(getTierGroupKey('leaderboard_3')).toBe('leaderboard_');
    });

    it('returns prefix for leaderboard_champion badges', () => {
      expect(getTierGroupKey('leaderboard_champion_3')).toBe('leaderboard_champion_');
      expect(getTierGroupKey('leaderboard_champion_5')).toBe('leaderboard_champion_');
    });

    it('returns null for non-tiered badges', () => {
      expect(getTierGroupKey('special_perfectionist')).toBeNull();
      expect(getTierGroupKey('hidden_beta_tester')).toBeNull();
      expect(getTierGroupKey('social_friendly')).toBeNull();
    });

    it('returns null for badges with non-numeric suffix', () => {
      expect(getTierGroupKey('creator_abc')).toBeNull();
      expect(getTierGroupKey('leaderboard_champion')).toBeNull();
    });
  });

  describe('isTierGroupAscending', () => {
    it('returns true for leaderboard position badges', () => {
      expect(isTierGroupAscending('leaderboard_')).toBe(true);
    });

    it('returns false for other tier groups', () => {
      expect(isTierGroupAscending('creator_')).toBe(false);
      expect(isTierGroupAscending('fulfilled_')).toBe(false);
      expect(isTierGroupAscending('leaderboard_champion_')).toBe(false);
    });
  });

  describe('sortTierBadges', () => {
    it('sorts creator badges by threshold descending (higher = better)', () => {
      const badges = [
        createBadge('creator_1', 1),
        createBadge('creator_100', 100),
        createBadge('creator_15', 15),
      ];

      const sorted = sortTierBadges(badges, 'creator_');

      expect(sorted.map((b) => b.key)).toEqual(['creator_100', 'creator_15', 'creator_1']);
    });

    it('sorts leaderboard position badges by threshold ascending (lower = better)', () => {
      const badges = [
        createBadge('leaderboard_3', 3),
        createBadge('leaderboard_1', 1),
        createBadge('leaderboard_2', 2),
      ];

      const sorted = sortTierBadges(badges, 'leaderboard_');

      expect(sorted.map((b) => b.key)).toEqual(['leaderboard_1', 'leaderboard_2', 'leaderboard_3']);
    });
  });

  describe('getHighestTierBadge', () => {
    it('returns the highest tier badge for creator group', () => {
      const badges = [
        createBadge('creator_1', 1),
        createBadge('creator_30', 30),
        createBadge('creator_15', 15),
      ];

      const highest = getHighestTierBadge(badges, 'creator_');

      expect(highest.key).toBe('creator_30');
    });

    it('returns the highest tier badge for leaderboard position group', () => {
      const badges = [createBadge('leaderboard_3', 3), createBadge('leaderboard_2', 2)];

      const highest = getHighestTierBadge(badges, 'leaderboard_');

      expect(highest.key).toBe('leaderboard_2');
    });
  });

  describe('groupBadgesByTier', () => {
    const allBadges = [
      createBadge('creator_1', 1),
      createBadge('creator_5', 5),
      createBadge('creator_15', 15),
      createBadge('creator_30', 30),
      createBadge('creator_50', 50),
      createBadge('fulfilled_1', 1, 'ACCURACY'),
      createBadge('fulfilled_5', 5, 'ACCURACY'),
      createBadge('special_perfectionist', null, 'SPECIAL'),
      createBadge('hidden_beta_tester', null, 'HIDDEN'),
    ];

    it('groups tiered badges and separates standalone badges', () => {
      const userBadges = [
        createBadge('creator_1', 1),
        createBadge('creator_15', 15),
        createBadge('special_perfectionist', null, 'SPECIAL'),
      ];
      const knownBadgeKeys = new Set([
        'creator_1',
        'creator_5',
        'creator_15',
        'creator_30',
        'special_perfectionist',
      ]);

      const result = groupBadgesByTier(userBadges, allBadges, knownBadgeKeys);

      expect(result.tierGroups).toHaveLength(1);
      expect(result.standaloneBadges).toHaveLength(1);
      expect(result.standaloneBadges[0].key).toBe('special_perfectionist');
    });

    it('identifies highest earned badge in tier group', () => {
      const userBadges = [
        createBadge('creator_1', 1),
        createBadge('creator_5', 5),
        createBadge('creator_15', 15),
      ];
      const knownBadgeKeys = new Set(['creator_1', 'creator_5', 'creator_15', 'creator_30']);

      const result = groupBadgesByTier(userBadges, allBadges, knownBadgeKeys);

      expect(result.tierGroups[0].highestEarned.key).toBe('creator_15');
    });

    it('includes known unearned badges', () => {
      const userBadges = [createBadge('creator_1', 1), createBadge('creator_15', 15)];
      const knownBadgeKeys = new Set(['creator_1', 'creator_5', 'creator_15', 'creator_30']);

      const result = groupBadgesByTier(userBadges, allBadges, knownBadgeKeys);

      const knownUnearned = result.tierGroups[0].knownUnearnedBadges;
      expect(knownUnearned.map((b) => b.key)).toEqual(['creator_30', 'creator_5']);
    });

    it('excludes unknown badges from knownUnearnedBadges', () => {
      const userBadges = [createBadge('creator_1', 1)];
      // creator_50 is in allBadges but not in knownBadgeKeys
      const knownBadgeKeys = new Set(['creator_1', 'creator_5']);

      const result = groupBadgesByTier(userBadges, allBadges, knownBadgeKeys);

      const knownUnearned = result.tierGroups[0].knownUnearnedBadges;
      expect(knownUnearned.map((b) => b.key)).toEqual(['creator_5']);
      expect(knownUnearned.map((b) => b.key)).not.toContain('creator_50');
    });

    it('handles multiple tier groups', () => {
      const userBadges = [
        createBadge('creator_1', 1),
        createBadge('fulfilled_1', 1, 'ACCURACY'),
        createBadge('fulfilled_5', 5, 'ACCURACY'),
      ];
      const knownBadgeKeys = new Set(['creator_1', 'fulfilled_1', 'fulfilled_5']);

      const result = groupBadgesByTier(userBadges, allBadges, knownBadgeKeys);

      expect(result.tierGroups).toHaveLength(2);
      expect(result.tierGroups.map((g) => g.prefix).sort()).toEqual(['creator_', 'fulfilled_']);
    });
  });
});
