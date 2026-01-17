import { NextResponse } from 'next/server';

import { validateSession } from '@/lib/auth/admin-validation';
import { prisma } from '@/lib/db/prisma';

// GET: Alle Daten für initialen Store-State laden
export async function GET() {
  const validation = await validateSession();
  if (validation.error) return validation.error;

  const { session } = validation;
  const isAdmin = session.role === 'ADMIN';

  const [users, rounds, prophecies, ratings, badges, myBadges, allUserBadges] = await Promise.all([
    // Admins see all users, non-admins only approved
    prisma.user.findMany({
      where: isAdmin ? {} : { status: 'APPROVED' },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        avatarEffect: true,
        avatarEffectColors: true,
        animationsEnabled: true,
        role: true,
        status: true,
        isBot: true,
        createdAt: true,
      },
    }),
    prisma.round.findMany({
      orderBy: { createdAt: 'desc' },
    }),
    prisma.prophecy.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        creatorId: true,
        roundId: true,
        createdAt: true,
        fulfilled: true,
        resolvedAt: true,
      },
    }),
    prisma.rating.findMany({
      select: {
        id: true,
        value: true,
        prophecyId: true,
        userId: true,
        createdAt: true,
      },
    }),
    // All badge definitions
    prisma.badge.findMany({
      orderBy: { createdAt: 'asc' },
    }),
    // Current user's badges
    prisma.userBadge.findMany({
      where: { userId: session.userId },
      include: { badge: true },
      orderBy: { earnedAt: 'desc' },
    }),
    // All user badges with earnedAt (for displaying badges on user cards and modals)
    prisma.userBadge.findMany({
      select: {
        userId: true,
        badgeId: true,
        earnedAt: true,
      },
    }),
  ]);

  // Build a map of userId -> badgeIds and transform allUserBadges
  const userBadgeMap = new Map<string, string[]>();
  const transformedAllUserBadges = allUserBadges.map((ub) => {
    const existing = userBadgeMap.get(ub.userId) || [];
    existing.push(ub.badgeId);
    userBadgeMap.set(ub.userId, existing);
    return {
      userId: ub.userId,
      badgeId: ub.badgeId,
      earnedAt: ub.earnedAt.toISOString(),
    };
  });

  // Transform dates to ISO strings and parse JSON fields
  const transformedUsers = users.map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
    avatarEffectColors: user.avatarEffectColors ? JSON.parse(user.avatarEffectColors) : undefined,
    badgeIds: userBadgeMap.get(user.id) || [],
  }));

  const transformedRounds = rounds.map((round) => ({
    id: round.id,
    title: round.title,
    submissionDeadline: round.submissionDeadline.toISOString(),
    ratingDeadline: round.ratingDeadline.toISOString(),
    fulfillmentDate: round.fulfillmentDate.toISOString(),
    resultsPublishedAt: round.resultsPublishedAt?.toISOString() ?? null,
    createdAt: round.createdAt.toISOString(),
  }));

  const transformedProphecies = prophecies.map((prophecy) => ({
    ...prophecy,
    createdAt: prophecy.createdAt.toISOString(),
    resolvedAt: prophecy.resolvedAt?.toISOString() ?? null,
  }));

  const transformedRatings = ratings.map((rating) => ({
    ...rating,
    createdAt: rating.createdAt.toISOString(),
  }));

  const transformedBadges = badges.map((badge) => ({
    ...badge,
    createdAt: badge.createdAt.toISOString(),
  }));

  const transformedMyBadges = myBadges.map((userBadge) => ({
    ...userBadge,
    earnedAt: userBadge.earnedAt.toISOString(),
    badge: {
      ...userBadge.badge,
      createdAt: userBadge.badge.createdAt.toISOString(),
    },
  }));

  return NextResponse.json({
    users: transformedUsers,
    rounds: transformedRounds,
    prophecies: transformedProphecies,
    ratings: transformedRatings,
    badges: transformedBadges,
    myBadges: transformedMyBadges,
    allUserBadges: transformedAllUserBadges,
    currentUserId: session.userId,
  });
}
