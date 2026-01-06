import type { Badge } from '@/store/useBadgeStore';

/**
 * Configuration for tier groups.
 * - sortAsc: true means lower threshold = better (e.g., leaderboard position)
 * - sortAsc: false means higher threshold = better (e.g., creator count)
 *
 * Order matters! More specific prefixes must come first.
 */
const TIER_GROUP_CONFIG: Array<{ prefix: string; sortAsc: boolean }> = [
  { prefix: 'leaderboard_champion_', sortAsc: false },
  { prefix: 'leaderboard_', sortAsc: true }, // Position: 1st > 2nd > 3rd
  { prefix: 'rater_accuracy_', sortAsc: false },
  { prefix: 'rater_', sortAsc: false },
  { prefix: 'accuracy_rate_', sortAsc: false },
  { prefix: 'fulfilled_', sortAsc: false },
  { prefix: 'creator_', sortAsc: false },
  { prefix: 'rounds_', sortAsc: false },
];

export interface TierGroup {
  prefix: string;
  /** All badges in this tier group, sorted by "value" (best first) */
  allBadges: Badge[];
  /** Badges the user has earned */
  earnedBadges: Badge[];
  /** The highest tier badge the user has earned */
  highestEarned: Badge;
  /** Known badges (awarded to at least one user) that user hasn't earned yet */
  knownUnearnedBadges: Badge[];
}

/**
 * Get the tier group prefix for a badge key.
 * Returns null if the badge is not part of a tier group.
 */
export function getTierGroupKey(badgeKey: string): string | null {
  for (const { prefix } of TIER_GROUP_CONFIG) {
    if (badgeKey.startsWith(prefix)) {
      // Verify it ends with a number (threshold)
      const suffix = badgeKey.slice(prefix.length);
      if (/^\d+$/.test(suffix)) {
        return prefix;
      }
    }
  }
  return null;
}

/**
 * Check if a tier group uses ascending sort (lower threshold = better).
 */
export function isTierGroupAscending(prefix: string): boolean {
  const config = TIER_GROUP_CONFIG.find((c) => c.prefix === prefix);
  return config?.sortAsc ?? false;
}

/**
 * Sort badges within a tier group by their "value" (best first).
 */
export function sortTierBadges(badges: Badge[], prefix: string): Badge[] {
  const sortAsc = isTierGroupAscending(prefix);

  return [...badges].sort((a, b) => {
    const thresholdA = a.threshold ?? 0;
    const thresholdB = b.threshold ?? 0;

    // For ascending groups (leaderboard position), lower is better
    // For descending groups (creator count), higher is better
    return sortAsc ? thresholdA - thresholdB : thresholdB - thresholdA;
  });
}

/**
 * Get the highest tier badge from a list of earned badges in the same tier group.
 */
export function getHighestTierBadge(badges: Badge[], prefix: string): Badge {
  const sorted = sortTierBadges(badges, prefix);
  return sorted[0];
}

/**
 * Group user badges by tier, showing only the highest tier per group.
 *
 * @param userBadges - Badges the user has earned
 * @param allBadges - All badge definitions
 * @param knownBadgeKeys - Badge keys that have been awarded to at least one user
 * @returns Object with tier groups and standalone badges
 */
export function groupBadgesByTier(
  userBadges: Badge[],
  allBadges: Badge[],
  knownBadgeKeys: Set<string>
): {
  tierGroups: TierGroup[];
  standaloneBadges: Badge[];
} {
  const tierGroupsMap = new Map<string, Badge[]>();
  const standaloneBadges: Badge[] = [];

  // Group user badges by tier prefix
  for (const badge of userBadges) {
    const prefix = getTierGroupKey(badge.key);
    if (prefix) {
      const existing = tierGroupsMap.get(prefix) ?? [];
      existing.push(badge);
      tierGroupsMap.set(prefix, existing);
    } else {
      standaloneBadges.push(badge);
    }
  }

  // Build tier groups with all relevant badges
  const tierGroups: TierGroup[] = [];

  for (const [prefix, earnedBadges] of tierGroupsMap) {
    // Get all badges in this tier group from all badge definitions
    const allTierBadges = allBadges.filter((b) => getTierGroupKey(b.key) === prefix);

    // Sort all badges by value (best first)
    const sortedAllBadges = sortTierBadges(allTierBadges, prefix);

    // Get the highest earned badge
    const highestEarned = getHighestTierBadge(earnedBadges, prefix);

    // Get earned badge keys
    const earnedKeys = new Set(earnedBadges.map((b) => b.key));

    // Find known badges that user hasn't earned yet
    const knownUnearnedBadges = sortedAllBadges.filter(
      (b) => knownBadgeKeys.has(b.key) && !earnedKeys.has(b.key)
    );

    tierGroups.push({
      prefix,
      allBadges: sortedAllBadges,
      earnedBadges: sortTierBadges(earnedBadges, prefix),
      highestEarned,
      knownUnearnedBadges,
    });
  }

  return { tierGroups, standaloneBadges };
}
