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
        category: badge.category,
        rarity: badge.rarity,
        threshold: badge.threshold,
      },
      create: {
        key: badge.key,
        name: badge.name,
        description: badge.description,
        requirement: badge.requirement,
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
  // Generous: gives +10 ratings (gives others chance for big wins)
  if (stats.maxRatingsGiven >= 10) badges.push(await tryAwardBadge(userId, 'social_generous'));
  // Ruthless: gives -10 ratings (denies others prophetic ability)
  if (stats.minRatingsGiven >= 10) badges.push(await tryAwardBadge(userId, 'social_ruthless'));

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

// ============================================================================
// Round Completion Badges
// ============================================================================

interface RoundRatingInfo {
  prophecyId: string;
  prophecyCreatorId: string;
  prophecyCreatedAt: Date;
  ratings: Array<{
    userId: string;
    value: number;
    createdAt: Date;
    isBot: boolean;
  }>;
  fulfilled: boolean | null;
  avgRating: number | null;
}

/**
 * Get rater accuracy for a specific round
 * Returns percentage of correct predictions (0-100)
 */
async function getUserRoundAccuracy(roundId: string, userId: string): Promise<number> {
  const ratings = await prisma.rating.findMany({
    where: {
      userId,
      prophecy: { roundId },
    },
    include: {
      prophecy: { select: { fulfilled: true } },
    },
  });

  const resolvedRatings = ratings.filter((r) => r.prophecy.fulfilled !== null);
  if (resolvedRatings.length === 0) return 0;

  let correct = 0;
  for (const r of resolvedRatings) {
    const isFulfilled = r.prophecy.fulfilled === true;
    const predictedFulfilled = r.value < 0;
    if (isFulfilled === predictedFulfilled) correct++;
  }

  return (correct / resolvedRatings.length) * 100;
}

/**
 * Get bot accuracy for a specific round
 */
async function getBotRoundAccuracy(roundId: string, botUsername: string): Promise<number> {
  const bot = await prisma.user.findUnique({
    where: { username: botUsername },
  });
  if (!bot) return 0;

  return getUserRoundAccuracy(roundId, bot.id);
}

/**
 * Get rating info for all prophecies in a round
 */
async function getRoundProphecyRatings(roundId: string): Promise<RoundRatingInfo[]> {
  const prophecies = await prisma.prophecy.findMany({
    where: { roundId },
    include: {
      ratings: {
        include: {
          user: { select: { isBot: true } },
        },
      },
    },
  });

  return prophecies.map((p) => {
    const humanRatings = p.ratings.filter((r) => !r.user.isBot && r.value !== 0);
    const avgRating =
      humanRatings.length > 0
        ? humanRatings.reduce((sum, r) => sum + r.value, 0) / humanRatings.length
        : null;

    return {
      prophecyId: p.id,
      prophecyCreatorId: p.creatorId,
      prophecyCreatedAt: p.createdAt,
      ratings: p.ratings.map((r) => ({
        userId: r.userId,
        value: r.value,
        createdAt: r.createdAt,
        isBot: r.user.isBot,
      })),
      fulfilled: p.fulfilled,
      avgRating,
    };
  });
}

/**
 * Check if user was first to create a prophecy in a round
 */
export async function isFirstProphecyOfRound(
  roundId: string,
  prophecyId: string
): Promise<boolean> {
  const firstProphecy = await prisma.prophecy.findFirst({
    where: { roundId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  return firstProphecy?.id === prophecyId;
}

// Helper: Check speedrunner badge
function checkSpeedrunner(prophecyRatings: RoundRatingInfo[], userId: string): boolean {
  const userRatings = prophecyRatings.flatMap((p) =>
    p.ratings.filter((r) => r.userId === userId && !r.isBot)
  );
  if (userRatings.length === 0) return false;

  const timestamps = userRatings.map((r) => r.createdAt.getTime());
  const durationMinutes = (Math.max(...timestamps) - Math.min(...timestamps)) / (1000 * 60);
  return durationMinutes < 10;
}

// Helper: Check against stream badge
function checkAgainstStream(prophecyRatings: RoundRatingInfo[], userId: string): boolean {
  for (const prophecy of prophecyRatings) {
    if (prophecy.fulfilled === null || prophecy.avgRating === null) continue;
    const userRating = prophecy.ratings.find((r) => r.userId === userId);
    if (!userRating || userRating.value === 0) continue;

    const userSign = userRating.value > 0 ? 1 : -1;
    const avgSign = prophecy.avgRating > 0 ? 1 : -1;
    if (userSign === avgSign) continue;

    const predictedFulfilled = userRating.value < 0;
    if (predictedFulfilled === prophecy.fulfilled) return true;
  }
  return false;
}

// Helper: Check morning glory badge
function checkMorningGlory(prophecyRatings: RoundRatingInfo[], userId: string): boolean {
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  for (const prophecy of prophecyRatings) {
    const userRating = prophecy.ratings.find((r) => r.userId === userId && !r.isBot);
    if (!userRating) continue;

    const timeDiff = userRating.createdAt.getTime() - prophecy.prophecyCreatedAt.getTime();
    if (timeDiff >= 0 && timeDiff <= TWENTY_FOUR_HOURS) return true;
  }
  return false;
}

// Helper: Check if prophecy is controversial
function isControversial(prophecy: RoundRatingInfo): boolean {
  const values = prophecy.ratings.filter((r) => !r.isBot).map((r) => r.value);
  if (values.length < 2) return false;
  return Math.min(...values) <= -10 && Math.max(...values) >= 10;
}

// Helper: Try to award a badge if condition is met, pushing to array
async function tryAwardConditionalBadge(
  condition: boolean,
  userId: string,
  badgeKey: string,
  newBadges: AwardedUserBadge[]
): Promise<void> {
  if (!condition) return;
  const result = await awardBadge(userId, badgeKey);
  if (result?.isNew) newBadges.push(result.userBadge);
}

// Helper: Award participant badges
async function awardParticipantBadges(
  userId: string,
  roundId: string,
  prophecyRatings: RoundRatingInfo[],
  kimberlyAccuracy: number,
  randolfAccuracy: number,
  newBadges: AwardedUserBadge[]
): Promise<void> {
  const userAccuracy = await getUserRoundAccuracy(roundId, userId);

  await tryAwardConditionalBadge(
    userAccuracy > kimberlyAccuracy,
    userId,
    'hidden_bot_beater',
    newBadges
  );
  await tryAwardConditionalBadge(
    userAccuracy < randolfAccuracy && userAccuracy > 0,
    userId,
    'hidden_worse_than_random',
    newBadges
  );
  await tryAwardConditionalBadge(
    checkSpeedrunner(prophecyRatings, userId),
    userId,
    'time_speedrunner',
    newBadges
  );
  await tryAwardConditionalBadge(
    checkAgainstStream(prophecyRatings, userId),
    userId,
    'special_against_stream',
    newBadges
  );
  await tryAwardConditionalBadge(
    checkMorningGlory(prophecyRatings, userId),
    userId,
    'time_morning_glory',
    newBadges
  );
}

// Helper: Award creator badges
async function awardCreatorBadges(
  prophecyRatings: RoundRatingInfo[],
  newBadges: AwardedUserBadge[]
): Promise<void> {
  for (const prophecy of prophecyRatings) {
    if (prophecy.fulfilled === null || prophecy.avgRating === null) continue;

    if (prophecy.avgRating > 5 && prophecy.fulfilled === true) {
      const result = await awardBadge(prophecy.prophecyCreatorId, 'special_unicorn');
      if (result?.isNew) newBadges.push(result.userBadge);
    }
    if (prophecy.avgRating > 5 && prophecy.fulfilled === false) {
      const result = await awardBadge(prophecy.prophecyCreatorId, 'special_party_crasher');
      if (result?.isNew) newBadges.push(result.userBadge);
    }
  }
}

// Helper: Award chaos agent badge
async function awardChaosAgentBadges(
  prophecyRatings: RoundRatingInfo[],
  newBadges: AwardedUserBadge[]
): Promise<void> {
  const userProphecies = new Map<string, RoundRatingInfo[]>();
  for (const p of prophecyRatings) {
    const existing = userProphecies.get(p.prophecyCreatorId) || [];
    existing.push(p);
    userProphecies.set(p.prophecyCreatorId, existing);
  }

  for (const [creatorId, prophecies] of userProphecies) {
    const hasFulfilled = prophecies.some((p) => p.fulfilled === true);
    const hasNotFulfilled = prophecies.some((p) => p.fulfilled === false);
    const hasControversial = prophecies.some(isControversial);

    if (hasFulfilled && hasNotFulfilled && hasControversial) {
      const result = await awardBadge(creatorId, 'special_chaos_agent');
      if (result?.isNew) newBadges.push(result.userBadge);
    }
  }
}

/**
 * Award all round completion badges
 * Called when round results are published
 */
export async function awardRoundCompletionBadges(
  roundId: string,
  creatorLeaderboard: { userId: string }[]
): Promise<AwardedUserBadge[]> {
  const newBadges: AwardedUserBadge[] = [];
  const prophecyRatings = await getRoundProphecyRatings(roundId);

  // Collect participant IDs
  const participantIds = new Set<string>();
  for (const p of prophecyRatings) {
    participantIds.add(p.prophecyCreatorId);
    for (const r of p.ratings) {
      if (!r.isBot) participantIds.add(r.userId);
    }
  }

  // Get bot accuracies
  const kimberlyAccuracy = await getBotRoundAccuracy(roundId, 'kimberly');
  const randolfAccuracy = await getBotRoundAccuracy(roundId, 'randolf');

  // Award participant badges
  for (const userId of participantIds) {
    await awardParticipantBadges(
      userId,
      roundId,
      prophecyRatings,
      kimberlyAccuracy,
      randolfAccuracy,
      newBadges
    );
  }

  // Award creator badges
  await awardCreatorBadges(prophecyRatings, newBadges);

  // Underdog badge
  const firstPlace = creatorLeaderboard[0];
  if (firstPlace) {
    const isUnderdog = await checkUnderdogStatus(roundId, firstPlace.userId);
    if (isUnderdog) {
      const result = await awardBadge(firstPlace.userId, 'special_underdog');
      if (result?.isNew) newBadges.push(result.userBadge);
    }
  }

  // Chaos agent badges
  await awardChaosAgentBadges(prophecyRatings, newBadges);

  return newBadges;
}

// Type for prophecies with ratings for score calculation
type ProphecyWithRatings = {
  creatorId: string;
  fulfilled: boolean | null;
  ratings: Array<{ value: number; user: { isBot: boolean } }>;
};

/**
 * Calculate creator scores from prophecies
 */
function calculateCreatorScores(prophecies: ProphecyWithRatings[]): Map<string, number> {
  const scores = new Map<string, number>();
  for (const p of prophecies) {
    const humanRatings = p.ratings.filter((r) => !r.user.isBot && r.value !== 0);
    if (humanRatings.length === 0) continue;
    const avgRating = humanRatings.reduce((sum, r) => sum + r.value, 0) / humanRatings.length;
    if (avgRating <= 0 || p.fulfilled !== true) continue;

    const currentScore = scores.get(p.creatorId) || 0;
    scores.set(p.creatorId, currentScore + avgRating);
  }
  return scores;
}

/**
 * Get top 3 creators from score map
 */
function getTop3CreatorIds(scores: Map<string, number>): string[] {
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);
}

/**
 * Check if user participated but wasn't in top 3 for a round
 * Returns 'not_participated' | 'in_top3' | 'underdog'
 */
async function checkRoundPlacement(
  roundId: string,
  userId: string
): Promise<'not_participated' | 'in_top3' | 'underdog'> {
  const prophecies = await prisma.prophecy.findMany({
    where: { roundId },
    include: {
      ratings: {
        include: { user: { select: { isBot: true } } },
      },
    },
  });

  const userParticipated = prophecies.some((p) => p.creatorId === userId);
  if (!userParticipated) return 'not_participated';

  const scores = calculateCreatorScores(prophecies);
  const top3 = getTop3CreatorIds(scores);

  return top3.includes(userId) ? 'in_top3' : 'underdog';
}

/**
 * Check if user qualifies for underdog badge
 * (Not in top 3 for last 2 published rounds)
 */
async function checkUnderdogStatus(currentRoundId: string, userId: string): Promise<boolean> {
  const currentRound = await prisma.round.findUnique({
    where: { id: currentRoundId },
    select: { resultsPublishedAt: true },
  });
  if (!currentRound?.resultsPublishedAt) return false;

  const previousRounds = await prisma.round.findMany({
    where: {
      resultsPublishedAt: { not: null, lt: currentRound.resultsPublishedAt },
    },
    orderBy: { resultsPublishedAt: 'desc' },
    take: 2,
    select: { id: true },
  });

  if (previousRounds.length < 2) return false;

  for (const round of previousRounds) {
    const placement = await checkRoundPlacement(round.id, userId);
    if (placement !== 'underdog') return false;
  }

  return true;
}
