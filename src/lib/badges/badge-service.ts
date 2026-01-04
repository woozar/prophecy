import { BadgeCategory, BadgeRarity } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';

import { allBadgeDefinitions } from './badge-definitions';

export interface UserStats {
  propheciesCreated: number;
  propheciesFulfilled: number;
  accuracyRate: number; // 0-100
  ratingsGiven: number;
  raterAccuracy: number; // 0-100
  roundsParticipated: number;
  leaderboardWins: number; // 1st place count
  leaderboardSecond: number; // 2nd place count
  leaderboardThird: number; // 3rd place count
  averageRatingGiven: number; // -10 to +10
  maxRatingsGiven: number; // count of +10 ratings
  minRatingsGiven: number; // count of -10 ratings
}

/**
 * Seed all badge definitions to the database
 */
export async function seedBadges(): Promise<void> {
  for (const badge of allBadgeDefinitions) {
    await prisma.badge.upsert({
      where: { key: badge.key },
      update: {
        name: badge.name,
        description: badge.description,
        requirement: badge.requirement,
        icon: badge.icon,
        category: badge.category,
        rarity: badge.rarity,
        threshold: badge.threshold,
      },
      create: {
        key: badge.key,
        name: badge.name,
        description: badge.description,
        requirement: badge.requirement,
        icon: badge.icon,
        category: badge.category,
        rarity: badge.rarity,
        threshold: badge.threshold,
      },
    });
  }
  console.log(`✓ ${allBadgeDefinitions.length} Badges synchronisiert`);
}

// Return type for newly awarded badges
export interface AwardedUserBadge {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: Date;
  badge: {
    id: string;
    key: string;
    name: string;
    description: string;
    icon: string;
    category: BadgeCategory;
    rarity: BadgeRarity;
    threshold: number | null;
  };
}

/**
 * Award a badge to a user if they don't already have it
 * Returns the awarded badge or null if already owned
 */
export async function awardBadge(
  userId: string,
  badgeKey: string
): Promise<{ userBadge: AwardedUserBadge; isNew: boolean } | null> {
  const badgeDef = allBadgeDefinitions.find((b) => b.key === badgeKey);
  if (!badgeDef) {
    console.warn(`Badge definition not found: ${badgeKey}`);
    return null;
  }

  const badge = await prisma.badge.findUnique({
    where: { key: badgeKey },
  });

  if (!badge) {
    console.warn(`Badge not found in database: ${badgeKey}`);
    return null;
  }

  // Check if user already has this badge
  const existing = await prisma.userBadge.findUnique({
    where: {
      userId_badgeId: {
        userId,
        badgeId: badge.id,
      },
    },
    include: { badge: true },
  });

  if (existing) {
    return { userBadge: existing, isNew: false };
  }

  // Award the badge
  const newUserBadge = await prisma.userBadge.create({
    data: {
      userId,
      badgeId: badge.id,
    },
    include: { badge: true },
  });

  return { userBadge: newUserBadge, isNew: true };
}

/**
 * Get all badges for a user
 */
export async function getUserBadges(userId: string) {
  return prisma.userBadge.findMany({
    where: { userId },
    include: {
      badge: true,
    },
    orderBy: {
      earnedAt: 'desc',
    },
  });
}

/**
 * Get user statistics for badge calculation
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  const [prophecies, ratings, roundParticipation] = await Promise.all([
    // Get user's prophecies
    prisma.prophecy.findMany({
      where: { creatorId: userId },
      select: {
        id: true,
        fulfilled: true,
      },
    }),
    // Get user's ratings
    prisma.rating.findMany({
      where: { userId },
      select: {
        value: true,
        prophecy: {
          select: {
            fulfilled: true,
          },
        },
      },
    }),
    // Get rounds where user participated
    prisma.round.findMany({
      where: {
        OR: [
          { prophecies: { some: { creatorId: userId } } },
          { prophecies: { some: { ratings: { some: { userId } } } } },
        ],
        resultsPublishedAt: { not: null },
      },
      select: { id: true },
    }),
  ]);

  const propheciesCreated = prophecies.length;
  const propheciesFulfilled = prophecies.filter((p) => p.fulfilled === true).length;
  const propheciesResolved = prophecies.filter((p) => p.fulfilled !== null).length;
  const accuracyRate =
    propheciesResolved > 0 ? (propheciesFulfilled / propheciesResolved) * 100 : 0;

  const ratingsGiven = ratings.length;

  // Rater accuracy: how well did the user predict fulfilled prophecies?
  // Rating scale: -10 = "Sicher" (will happen), +10 = "Unmöglich" (won't happen)
  const ratingsOnResolved = ratings.filter((r) => r.prophecy.fulfilled !== null);
  let correctRatings = 0;
  for (const rating of ratingsOnResolved) {
    const isFulfilled = rating.prophecy.fulfilled === true;
    // Negative ratings predict fulfillment, positive ratings predict non-fulfillment
    const predictedFulfilled = rating.value < 0;
    if (isFulfilled === predictedFulfilled) {
      correctRatings++;
    }
  }
  const raterAccuracy =
    ratingsOnResolved.length > 0 ? (correctRatings / ratingsOnResolved.length) * 100 : 0;

  const roundsParticipated = roundParticipation.length;

  // Calculate average rating given
  const avgRating =
    ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.value, 0) / ratings.length : 0;

  // Count extreme ratings
  const maxRatingsGiven = ratings.filter((r) => r.value === 10).length;
  const minRatingsGiven = ratings.filter((r) => r.value === -10).length;

  return {
    propheciesCreated,
    propheciesFulfilled,
    accuracyRate,
    ratingsGiven,
    raterAccuracy,
    roundsParticipated,
    leaderboardWins: 0, // Leaderboard tracking not yet implemented
    leaderboardSecond: 0,
    leaderboardThird: 0,
    averageRatingGiven: avgRating,
    maxRatingsGiven,
    minRatingsGiven,
  };
}

/**
 * Award threshold-based badges for a given stat
 */
async function awardThresholdBadges(
  userId: string,
  statValue: number,
  thresholds: number[],
  badgeKeyPrefix: string
): Promise<AwardedUserBadge[]> {
  const newBadges: AwardedUserBadge[] = [];
  for (const threshold of thresholds) {
    if (statValue >= threshold) {
      const result = await awardBadge(userId, `${badgeKeyPrefix}${threshold}`);
      if (result?.isNew) newBadges.push(result.userBadge);
    }
  }
  return newBadges;
}

/**
 * Try to award a badge and return it if newly awarded
 */
async function tryAwardBadge(userId: string, badgeKey: string): Promise<AwardedUserBadge | null> {
  const result = await awardBadge(userId, badgeKey);
  return result?.isNew ? result.userBadge : null;
}

/**
 * Award social badges based on rating patterns
 * Rating scale: -10 = "Sicher" (will happen/optimistic), +10 = "Unmöglich" (won't happen/skeptical)
 */
async function awardSocialBadges(userId: string, stats: UserStats): Promise<AwardedUserBadge[]> {
  const badges: (AwardedUserBadge | null)[] = [];

  // Rating-based social badges (require 20+ ratings)
  if (stats.ratingsGiven >= 20) {
    // Friendly/optimistic: average < -5 (believes prophecies will happen)
    if (stats.averageRatingGiven < -5) badges.push(await tryAwardBadge(userId, 'social_friendly'));
    // Skeptic: average > 2 (doubts prophecies will happen)
    if (stats.averageRatingGiven > 2) badges.push(await tryAwardBadge(userId, 'social_skeptic'));
    // Neutral: average between -1 and 1
    if (
      stats.averageRatingGiven >= -1 &&
      stats.averageRatingGiven <= 1 &&
      stats.ratingsGiven >= 30
    ) {
      badges.push(await tryAwardBadge(userId, 'social_neutral'));
    }
  }

  // Extreme rating badges
  // Generous: gives -10 ratings (believes strongly in prophecies)
  if (stats.minRatingsGiven >= 10) badges.push(await tryAwardBadge(userId, 'social_generous'));
  // Ruthless: gives +10 ratings (strongly doubts prophecies)
  if (stats.maxRatingsGiven >= 10) badges.push(await tryAwardBadge(userId, 'social_ruthless'));

  return badges.filter((b): b is AwardedUserBadge => b !== null);
}

/**
 * Check and award all applicable badges for a user
 * Returns list of newly awarded badges with full user badge data
 */
export async function checkAndAwardBadges(userId: string): Promise<AwardedUserBadge[]> {
  const stats = await getUserStats(userId);

  // Collect all badge awards in parallel where possible
  const badgePromises: Promise<AwardedUserBadge[]>[] = [
    awardThresholdBadges(userId, stats.propheciesCreated, [1, 5, 15, 30, 50, 100], 'creator_'),
    awardThresholdBadges(userId, stats.propheciesFulfilled, [1, 5, 10, 20, 35, 50], 'fulfilled_'),
    awardThresholdBadges(userId, stats.ratingsGiven, [10, 30, 75, 150, 300], 'rater_'),
    awardThresholdBadges(userId, stats.roundsParticipated, [1, 5, 15, 30, 50], 'rounds_'),
    awardSocialBadges(userId, stats),
  ];

  // Conditional badges
  if (stats.propheciesCreated >= 10) {
    badgePromises.push(
      awardThresholdBadges(userId, stats.accuracyRate, [60, 70, 80, 90], 'accuracy_rate_')
    );
  }
  if (stats.ratingsGiven >= 20) {
    badgePromises.push(
      awardThresholdBadges(userId, stats.raterAccuracy, [60, 70, 80, 90], 'rater_accuracy_')
    );
  }

  const results = await Promise.all(badgePromises);
  return results.flat();
}

/**
 * Get all badges with award info (for Hall of Fame)
 */
export async function getAwardedBadges() {
  const badges = await prisma.badge.findMany({
    include: {
      users: {
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
        orderBy: {
          earnedAt: 'asc',
        },
      },
    },
  });

  // Filter to only badges that have been awarded at least once
  // and add first achiever info
  return badges
    .filter((badge) => badge.users.length > 0)
    .map((badge) => ({
      ...badge,
      firstAchiever: badge.users[0]?.user,
      firstAchievedAt: badge.users[0]?.earnedAt,
      totalAchievers: badge.users.length,
    }))
    .sort((a, b) => {
      // Sort by first achieved date
      if (!a.firstAchievedAt || !b.firstAchievedAt) return 0;
      return a.firstAchievedAt.getTime() - b.firstAchievedAt.getTime();
    });
}

/**
 * Get all users who have a specific badge
 */
export async function getBadgeHolders(badgeId: string) {
  return prisma.userBadge.findMany({
    where: { badgeId },
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
    orderBy: {
      earnedAt: 'asc',
    },
  });
}

async function awardPositionBadges(
  creatorLeaderboard: { userId: string }[],
  newBadges: AwardedUserBadge[]
): Promise<void> {
  const positions = [
    { index: 0, badge: 'leaderboard_1' },
    { index: 1, badge: 'leaderboard_2' },
    { index: 2, badge: 'leaderboard_3' },
  ];

  for (const { index, badge } of positions) {
    const user = creatorLeaderboard[index];
    if (!user) continue;

    const result = await awardBadge(user.userId, badge);
    if (result?.isNew) newBadges.push(result.userBadge);
  }
}

async function awardChampionBadges(
  userId: string,
  winCount: number,
  newBadges: AwardedUserBadge[]
): Promise<void> {
  const championThresholds = [
    { wins: 3, badge: 'leaderboard_champion_3' },
    { wins: 5, badge: 'leaderboard_champion_5' },
  ];

  for (const { wins, badge } of championThresholds) {
    if (winCount < wins) continue;

    const result = await awardBadge(userId, badge);
    if (result?.isNew) newBadges.push(result.userBadge);
  }
}

/**
 * Award leaderboard badges based on round results
 * Called when round results are published
 * @param creatorLeaderboard - Sorted array of creators (1st place at index 0)
 * @param firstPlaceWinCount - Number of times the 1st place user has won (including this round)
 */
export async function awardLeaderboardBadges(
  creatorLeaderboard: { userId: string }[],
  firstPlaceWinCount?: number
): Promise<AwardedUserBadge[]> {
  const newBadges: AwardedUserBadge[] = [];

  await awardPositionBadges(creatorLeaderboard, newBadges);

  const firstPlace = creatorLeaderboard[0];
  if (firstPlace && firstPlaceWinCount) {
    await awardChampionBadges(firstPlace.userId, firstPlaceWinCount, newBadges);
  }

  return newBadges;
}
