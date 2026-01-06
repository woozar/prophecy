import { BadgeCategory, BadgeRarity } from '@prisma/client';

import badgeData from './badge-definitions.json';

export interface BadgeDefinition {
  key: string;
  name: string;
  description: string;
  requirement: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  threshold?: number;
}

// Type assertion for JSON data
type BadgeDataJson = {
  [key: string]: Array<{
    key: string;
    name: string;
    description: string;
    requirement: string;
    category: string;
    rarity: string;
    threshold?: number;
  }>;
};

const typedBadgeData = badgeData as BadgeDataJson;

// Cast JSON arrays to typed BadgeDefinition arrays
export const creatorBadges: BadgeDefinition[] = typedBadgeData.creator as BadgeDefinition[];
export const accuracyBadges: BadgeDefinition[] = typedBadgeData.accuracy as BadgeDefinition[];
export const accuracyRateBadges: BadgeDefinition[] =
  typedBadgeData.accuracyRate as BadgeDefinition[];
export const raterBadges: BadgeDefinition[] = typedBadgeData.rater as BadgeDefinition[];
export const raterAccuracyBadges: BadgeDefinition[] =
  typedBadgeData.raterAccuracy as BadgeDefinition[];
export const roundsBadges: BadgeDefinition[] = typedBadgeData.rounds as BadgeDefinition[];
export const leaderboardBadges: BadgeDefinition[] = typedBadgeData.leaderboard as BadgeDefinition[];
export const specialBadges: BadgeDefinition[] = typedBadgeData.special as BadgeDefinition[];
export const socialBadges: BadgeDefinition[] = typedBadgeData.social as BadgeDefinition[];
export const hiddenBadges: BadgeDefinition[] = typedBadgeData.hidden as BadgeDefinition[];
export const timeBadges: BadgeDefinition[] = typedBadgeData.time as BadgeDefinition[];

// Alle Badges zusammen
export const allBadgeDefinitions: BadgeDefinition[] = [
  ...creatorBadges,
  ...accuracyBadges,
  ...accuracyRateBadges,
  ...raterBadges,
  ...raterAccuracyBadges,
  ...roundsBadges,
  ...leaderboardBadges,
  ...specialBadges,
  ...socialBadges,
  ...hiddenBadges,
  ...timeBadges,
];

// Helper um Badge nach Key zu finden
export function getBadgeDefinitionByKey(key: string): BadgeDefinition | undefined {
  return allBadgeDefinitions.find((badge) => badge.key === key);
}

// Badges nach Kategorie gruppiert
export function getBadgesByCategory(category: BadgeCategory): BadgeDefinition[] {
  return allBadgeDefinitions.filter((badge) => badge.category === category);
}
