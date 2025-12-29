import { prisma } from '@/lib/db/prisma';
import type { CreatorStats, RaterStats, RoundStatistics } from './types';

interface UserInfo {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface ProphecyWithRelations {
  averageRating: number | null;
  fulfilled: boolean | null;
  creator: UserInfo;
  ratings: Array<{
    value: number;
    user: UserInfo;
  }>;
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
  return prophecy.averageRating !== null && prophecy.averageRating > 0;
}

function updateCreatorStatsForProphecy(stats: CreatorStats, prophecy: ProphecyWithRelations): void {
  stats.totalProphecies++;

  if (!isAcceptedProphecy(prophecy)) return;

  stats.acceptedProphecies++;
  stats.maxPossibleScore += prophecy.averageRating!;

  if (prophecy.fulfilled === true) {
    stats.fulfilledProphecies++;
    stats.totalScore += prophecy.averageRating!;
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

function isCorrectRating(ratingValue: number, fulfilled: boolean | null): boolean {
  return (ratingValue > 0 && fulfilled === true) || (ratingValue < 0 && fulfilled === false);
}

function updateRaterStatsForRating(
  stats: RaterStats,
  ratingValue: number,
  fulfilled: boolean | null
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

function buildRaterStats(resolvedProphecies: ProphecyWithRelations[]): RaterStats[] {
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
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
      },
    },
  });

  const acceptedProphecies = prophecies.filter(isAcceptedProphecy);
  const resolvedProphecies = acceptedProphecies.filter((p) => p.fulfilled !== null);

  return {
    roundId,
    creatorStats: buildCreatorStats(prophecies),
    raterStats: buildRaterStats(resolvedProphecies),
    totalAcceptedProphecies: acceptedProphecies.length,
    resolvedProphecies: resolvedProphecies.length,
    isComplete: acceptedProphecies.length === resolvedProphecies.length,
  };
}
