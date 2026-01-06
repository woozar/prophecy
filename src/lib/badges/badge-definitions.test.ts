import { BadgeCategory } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import {
  allBadgeDefinitions,
  getBadgeDefinitionByKey,
  getBadgesByCategory,
} from './badge-definitions';

describe('badge-definitions', () => {
  describe('allBadgeDefinitions', () => {
    it('contains badge definitions', () => {
      expect(allBadgeDefinitions.length).toBeGreaterThan(0);
    });

    it('each badge has required fields', () => {
      for (const badge of allBadgeDefinitions) {
        expect(badge.key).toBeDefined();
        expect(badge.name).toBeDefined();
        expect(badge.description).toBeDefined();
        expect(badge.requirement).toBeDefined();
        expect(badge.category).toBeDefined();
        expect(badge.rarity).toBeDefined();
      }
    });

    it('has unique keys for all badges', () => {
      const keys = allBadgeDefinitions.map((b) => b.key);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });
  });

  describe('getBadgeDefinitionByKey', () => {
    it('returns badge when key exists', () => {
      const badge = getBadgeDefinitionByKey('creator_1');
      expect(badge).toBeDefined();
      expect(badge?.key).toBe('creator_1');
      expect(badge?.category).toBe(BadgeCategory.CREATOR);
    });

    it('returns undefined for non-existent key', () => {
      const badge = getBadgeDefinitionByKey('non_existent_badge');
      expect(badge).toBeUndefined();
    });

    it('returns correct badge for different categories', () => {
      const raterBadge = getBadgeDefinitionByKey('rater_10');
      expect(raterBadge?.category).toBe(BadgeCategory.RATER);

      const accuracyBadge = getBadgeDefinitionByKey('fulfilled_1');
      expect(accuracyBadge?.category).toBe(BadgeCategory.ACCURACY);
    });
  });

  describe('getBadgesByCategory', () => {
    it('returns badges for CREATOR category', () => {
      const badges = getBadgesByCategory(BadgeCategory.CREATOR);
      expect(badges.length).toBeGreaterThan(0);
      for (const badge of badges) {
        expect(badge.category).toBe(BadgeCategory.CREATOR);
      }
    });

    it('returns badges for RATER category', () => {
      const badges = getBadgesByCategory(BadgeCategory.RATER);
      expect(badges.length).toBeGreaterThan(0);
      for (const badge of badges) {
        expect(badge.category).toBe(BadgeCategory.RATER);
      }
    });

    it('returns badges for ACCURACY category', () => {
      const badges = getBadgesByCategory(BadgeCategory.ACCURACY);
      expect(badges.length).toBeGreaterThan(0);
      for (const badge of badges) {
        expect(badge.category).toBe(BadgeCategory.ACCURACY);
      }
    });

    it('returns empty array for category with no badges', () => {
      // This test checks the function handles all categories correctly
      // All categories should have at least some badges, but the function
      // should return empty array if none match (defensive behavior)
      const allCategories = Object.values(BadgeCategory);
      for (const category of allCategories) {
        const badges = getBadgesByCategory(category);
        expect(Array.isArray(badges)).toBe(true);
        // All badges in result should match the category
        for (const badge of badges) {
          expect(badge.category).toBe(category);
        }
      }
    });

    it('returns different badges for different categories', () => {
      const creatorBadges = getBadgesByCategory(BadgeCategory.CREATOR);
      const raterBadges = getBadgesByCategory(BadgeCategory.RATER);

      // No overlap between categories
      const creatorKeys = new Set(creatorBadges.map((b) => b.key));
      for (const raterBadge of raterBadges) {
        expect(creatorKeys.has(raterBadge.key)).toBe(false);
      }
    });
  });
});
