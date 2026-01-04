import { prisma } from '@/lib/db/prisma';

import type { CreatorStats, RaterStats, RoundStatistics } from './types';

interface UserInfo {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface ProphecyWithRelations {
  fulfilled: boolean | null;
  creator: UserInfo;
  ratings: Array<{
    value: number;
    user: UserInfo & { isBot?: boolean };
  }>;
}

// Resolved prophecy has fulfilled !== null
interface ResolvedProphecy extends ProphecyWithRelations {
  fulfilled: boolean;
}

// Calculate average rating from ratings (excluding zero values and bot ratings)
function calculateAverageRating(ratings: ProphecyWithRelations['ratings']): number | null {
  const humanNonZeroRatings = ratings.filter((r) => r.value !== 0 && !r.user.isBot);
  if (humanNonZeroRatings.length === 0) return null;
  return humanNonZeroRatings.reduce((sum, r) => sum + r.value, 0) / humanNonZeroRatings.length;
}

function createCreatorStats(user: UserInfo): CreatorStats {
  return {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    totalProphecies: 0,
    acceptedProphecies: 0,
    acceptedPercentage: 0,
    fulfilledProphecies: 0,
    fulfilledPercentage: 0,
    totalScore: 0,
    maxPossibleScore: 0,
    scorePercentage: 0,
  };
}

function createRaterStats(user: UserInfo): RaterStats {
  return {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    totalRatings: 0,
    correctPoints: 0,
    incorrectPoints: 0,
    netScore: 0,
    maxPossibleScore: 0,
    hitRatePercentage: 0,
  };
}

function isAcceptedProphecy(prophecy: ProphecyWithRelations): boolean {
  const avgRating = calculateAverageRating(prophecy.ratings);
  return avgRating !== null && avgRating > 0;
}

function updateCreatorStatsForProphecy(stats: CreatorStats, prophecy: ProphecyWithRelations): void {
  stats.totalProphecies++;

  const avgRating = calculateAverageRating(prophecy.ratings);
  if (avgRating === null || avgRating <= 0) return;

  stats.acceptedProphecies++;
  stats.maxPossibleScore += avgRating;

  if (prophecy.fulfilled === true) {
    stats.fulfilledProphecies++;
    stats.totalScore += avgRating;
  }
}

function calculateCreatorPercentages(stats: CreatorStats): void {
  stats.acceptedPercentage =
    stats.totalProphecies > 0
      ? Math.round((stats.acceptedProphecies / stats.totalProphecies) * 100)
      : 0;
  stats.fulfilledPercentage =
    stats.acceptedProphecies > 0
      ? Math.round((stats.fulfilledProphecies / stats.acceptedProphecies) * 100)
      : 0;
  stats.scorePercentage =
    stats.maxPossibleScore > 0 ? Math.round((stats.totalScore / stats.maxPossibleScore) * 100) : 0;
}

// Rating scale: -10 = "will happen" (fulfilled), +10 = "won't happen" (not fulfilled)
function isCorrectRating(ratingValue: number, fulfilled: boolean): boolean {
  return (ratingValue < 0 && fulfilled) || (ratingValue > 0 && !fulfilled);
}

function updateRaterStatsForRating(
  stats: RaterStats,
  ratingValue: number,
  fulfilled: boolean
): void {
  stats.totalRatings++;
  const absValue = Math.abs(ratingValue);
  stats.maxPossibleScore += absValue;

  if (isCorrectRating(ratingValue, fulfilled)) {
    stats.correctPoints += absValue;
  } else {
    stats.incorrectPoints += absValue;
  }
}

function calculateRaterScores(stats: RaterStats): void {
  stats.netScore = stats.correctPoints - stats.incorrectPoints;
  stats.hitRatePercentage =
    stats.maxPossibleScore > 0 ? Math.round((stats.netScore / stats.maxPossibleScore) * 100) : 0;
}

function buildCreatorStats(prophecies: ProphecyWithRelations[]): CreatorStats[] {
  const creatorMap = new Map<string, CreatorStats>();

  for (const prophecy of prophecies) {
    const creator = prophecy.creator;
    let stats = creatorMap.get(creator.id);

    if (!stats) {
      stats = createCreatorStats(creator);
      creatorMap.set(creator.id, stats);
    }

    updateCreatorStatsForProphecy(stats, prophecy);
  }

  for (const stats of creatorMap.values()) {
    calculateCreatorPercentages(stats);
  }

  return Array.from(creatorMap.values()).sort((a, b) => b.totalScore - a.totalScore);
}

function buildRaterStats(resolvedProphecies: ResolvedProphecy[]): RaterStats[] {
  const raterMap = new Map<string, RaterStats>();

  for (const prophecy of resolvedProphecies) {
    for (const rating of prophecy.ratings) {
      if (rating.value === 0) continue;

      const user = rating.user;
      let stats = raterMap.get(user.id);

      if (!stats) {
        stats = createRaterStats(user);
        raterMap.set(user.id, stats);
      }

      updateRaterStatsForRating(stats, rating.value, prophecy.fulfilled);
    }
  }

  for (const stats of raterMap.values()) {
    calculateRaterScores(stats);
  }

  return Array.from(raterMap.values()).sort((a, b) => b.netScore - a.netScore);
}

export async function calculateRoundStatistics(roundId: string): Promise<RoundStatistics> {
  const prophecies = await prisma.prophecy.findMany({
    where: { roundId },
    include: {
      creator: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      ratings: {
        include: {
          user: {
            select: { id: true, username: true, displayName: true, avatarUrl: true, isBot: true },
          },
        },
      },
    },
  });

  const acceptedProphecies = prophecies.filter(isAcceptedProphecy);
  // Filter to resolved prophecies - fulfilled is guaranteed to be non-null after this filter
  const resolvedProphecies = acceptedProphecies
    .filter((p) => p.fulfilled !== null)
    .map((p) => ({ ...p, fulfilled: p.fulfilled as boolean }));

  return {
    roundId,
    creatorStats: buildCreatorStats(prophecies),
    raterStats: buildRaterStats(resolvedProphecies),
    totalAcceptedProphecies: acceptedProphecies.length,
    resolvedProphecies: resolvedProphecies.length,
    isComplete: acceptedProphecies.length === resolvedProphecies.length,
  };
}
