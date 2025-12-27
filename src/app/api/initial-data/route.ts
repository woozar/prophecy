import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

// GET: Alle Daten für initialen Store-State laden
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const [users, rounds, prophecies, ratings] = await Promise.all([
    prisma.user.findMany({
      where: { status: 'APPROVED' },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        avatarEffect: true,
        avatarEffectColors: true,
        role: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.round.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { prophecies: true },
        },
      },
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
        averageRating: true,
        ratingCount: true,
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
  ]);

  // Transform dates to ISO strings and parse JSON fields
  const transformedUsers = users.map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
    avatarEffectColors: user.avatarEffectColors ? JSON.parse(user.avatarEffectColors) : undefined,
  }));

  const transformedRounds = rounds.map((round) => ({
    id: round.id,
    title: round.title,
    submissionDeadline: round.submissionDeadline.toISOString(),
    ratingDeadline: round.ratingDeadline.toISOString(),
    fulfillmentDate: round.fulfillmentDate.toISOString(),
    createdAt: round.createdAt.toISOString(),
    _count: round._count,
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

  return NextResponse.json({
    users: transformedUsers,
    rounds: transformedRounds,
    prophecies: transformedProphecies,
    ratings: transformedRatings,
    currentUserId: session.userId,
  });
}
