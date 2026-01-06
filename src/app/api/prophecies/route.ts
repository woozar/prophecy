import { NextRequest, NextResponse } from 'next/server';

import { transformProphecyToResponse } from '@/lib/api/prophecy-transform';
import { validateBody } from '@/lib/api/validation';
import { createAuditLog } from '@/lib/audit/audit-service';
import { getSession } from '@/lib/auth/session';
import {
  type AwardedUserBadge,
  awardBadge,
  checkAndAwardBadges,
  isFirstProphecyOfRound,
} from '@/lib/badges/badge-service';
import { prisma } from '@/lib/db/prisma';
import { createProphecySchema } from '@/lib/schemas/prophecy';
import { sseEmitter } from '@/lib/sse/event-emitter';

/**
 * Check and award time/content-based badges for prophecy creation
 */
async function checkProphecyCreationBadges(
  userId: string,
  roundId: string,
  prophecyId: string,
  description: string,
  submissionDeadline: Date,
  now: Date,
  newBadges: AwardedUserBadge[]
): Promise<void> {
  // Last-minute: prophecy created within 24h of deadline
  const hoursUntilDeadline = (submissionDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntilDeadline < 24) {
    const result = await awardBadge(userId, 'time_last_minute');
    if (result?.isNew) newBadges.push(result.userBadge);
  }

  // Novelist: long description (≥500 chars)
  if (description.length >= 500) {
    const result = await awardBadge(userId, 'special_novelist');
    if (result?.isNew) newBadges.push(result.userBadge);
  }

  // Early bird: first prophecy of round
  if (await isFirstProphecyOfRound(roundId, prophecyId)) {
    const result = await awardBadge(userId, 'time_early_bird');
    if (result?.isNew) newBadges.push(result.userBadge);
  }

  // Night owl: prophecy between 00:00-05:00
  const hour = now.getHours();
  if (hour >= 0 && hour < 5) {
    const result = await awardBadge(userId, 'hidden_night_owl');
    if (result?.isNew) newBadges.push(result.userBadge);
  }
}

/**
 * Broadcast newly awarded badges via SSE
 */
function broadcastNewBadges(newBadges: AwardedUserBadge[]): void {
  for (const userBadge of newBadges) {
    sseEmitter.broadcast({
      type: 'badge:awarded',
      data: {
        id: userBadge.id,
        earnedAt: userBadge.earnedAt.toISOString(),
        userId: userBadge.userId,
        badgeId: userBadge.badgeId,
        badge: userBadge.badge,
      },
    });
  }
}

// GET /api/prophecies - Get prophecies for a round
export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const roundId = searchParams.get('roundId');
  const filter = searchParams.get('filter'); // "mine" | "toRate" | null

  if (!roundId) {
    return NextResponse.json({ error: 'roundId ist erforderlich' }, { status: 400 });
  }

  try {
    let whereClause: Record<string, unknown> = { roundId };

    if (filter === 'mine') {
      whereClause = { ...whereClause, creatorId: session.userId };
    } else if (filter === 'toRate') {
      // Prophecies not created by user and not yet rated by user
      whereClause = {
        ...whereClause,
        creatorId: { not: session.userId },
        ratings: {
          none: { userId: session.userId },
        },
      };
    }

    const prophecies = await prisma.prophecy.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            avatarEffect: true,
            avatarEffectColors: true,
          },
        },
        ratings: {
          select: { value: true, userId: true, user: { select: { isBot: true } } },
        },
      },
    });

    // Transform to include calculated rating stats and user's rating
    const transformedProphecies = prophecies.map((p) => {
      // Calculate averageRating from ratings (excluding zero values and bot ratings)
      const nonZeroRatings = p.ratings.filter((r) => r.value !== 0);
      const humanRatings = nonZeroRatings.filter((r) => !r.user.isBot);
      const ratingCount = nonZeroRatings.length;
      const averageRating =
        humanRatings.length > 0
          ? humanRatings.reduce((sum, r) => sum + r.value, 0) / humanRatings.length
          : null;
      const userRating = p.ratings.find((r) => r.userId === session.userId)?.value ?? null;

      return {
        id: p.id,
        title: p.title,
        description: p.description,
        createdAt: p.createdAt,
        creator: p.creator,
        averageRating,
        ratingCount,
        userRating,
        isOwn: p.creatorId === session.userId,
        fulfilled: p.fulfilled,
        resolvedAt: p.resolvedAt,
      };
    });

    return NextResponse.json({ prophecies: transformedProphecies });
  } catch (error) {
    console.error('Error fetching prophecies:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Prophezeiungen' }, { status: 500 });
  }
}

// POST /api/prophecies - Create a new prophecy
export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const validation = await validateBody(request, createProphecySchema);
    if (!validation.success) return validation.response;
    const { roundId, title, description } = validation.data;

    const round = await prisma.round.findUnique({ where: { id: roundId } });

    if (!round) {
      return NextResponse.json({ error: 'Runde nicht gefunden' }, { status: 404 });
    }

    const now = new Date();
    if (now > round.submissionDeadline) {
      return NextResponse.json({ error: 'Einreichungsfrist ist abgelaufen' }, { status: 400 });
    }

    const prophecy = await prisma.prophecy.create({
      data: { title, description, roundId, creatorId: session.userId },
    });

    await createAuditLog({
      entityType: 'PROPHECY',
      entityId: prophecy.id,
      action: 'CREATE',
      prophecyId: prophecy.id,
      userId: session.userId,
      newValue: { title, description },
    });

    const newBadges = await checkAndAwardBadges(session.userId);
    await checkProphecyCreationBadges(
      session.userId,
      roundId,
      prophecy.id,
      description,
      round.submissionDeadline,
      now,
      newBadges
    );
    broadcastNewBadges(newBadges);

    const prophecyData = transformProphecyToResponse(prophecy);
    sseEmitter.broadcast({ type: 'prophecy:created', data: prophecyData });

    return NextResponse.json({ prophecy: prophecyData });
  } catch (error) {
    console.error('Error creating prophecy:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen der Prophezeiung' }, { status: 500 });
  }
}
