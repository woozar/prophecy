import type { BadgeRarity } from '@prisma/client';

const RARITY_ORDER: Record<BadgeRarity, number> = {
  LEGENDARY: 0,
  GOLD: 1,
  SILVER: 2,
  BRONZE: 3,
};

const RARITY_LABELS: Record<BadgeRarity, string> = {
  LEGENDARY: 'Legendär',
  GOLD: 'Gold',
  SILVER: 'Silber',
  BRONZE: 'Bronze',
};

/**
 * Returns a numeric sort order for a badge rarity (lower = more rare).
 */
export function getRarityOrder(rarity: BadgeRarity): number {
  return RARITY_ORDER[rarity] ?? 99;
}

/**
 * Returns the display label for a badge rarity.
 */
export function getRarityLabel(rarity: BadgeRarity): string {
  return RARITY_LABELS[rarity] ?? rarity;
}

/**
 * Returns the CSS class for legendary badge cards based on animation preference.
 * Uses static styling when reduced motion is preferred.
 */
export function getLegendaryBadgeClass(isLegendary: boolean, reducedMotion: boolean): string {
  if (!isLegendary) return '';
  return reducedMotion ? 'badge-card-legendary-static' : 'badge-card-legendary';
}
