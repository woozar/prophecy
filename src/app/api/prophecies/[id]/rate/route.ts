import { NextRequest, NextResponse } from 'next/server';

import { transformProphecyToResponse } from '@/lib/api/prophecy-transform';
import { validateBody } from '@/lib/api/validation';
import { createAuditLog } from '@/lib/audit/audit-service';
import { getSession } from '@/lib/auth/session';
import { awardBadge, checkAndAwardBadges } from '@/lib/badges/badge-service';
import { prisma } from '@/lib/db/prisma';
import { AuditActions, auditEntityTypeSchema } from '@/lib/schemas/audit';
import { rateSchema } from '@/lib/schemas/rating';
import { sseEmitter } from '@/lib/sse/event-emitter';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface UserBadgeWithBadge {
  id: string;
  earnedAt: Date;
  userId: string;
  badgeId: string;
  badge: unknown;
}

function broadcastBadges(badges: UserBadgeWithBadge[]): void {
  for (const userBadge of badges) {
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

async function checkClutchRaterBadge(
  userId: string,
  ratingDeadline: Date,
  now: Date,
  badges: UserBadgeWithBadge[]
): Promise<void> {
  const hoursUntilDeadline = (ratingDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntilDeadline >= 1) return;

  const clutchResult = await awardBadge(userId, 'time_clutch_rater');
  if (clutchResult?.isNew) {
    badges.push(clutchResult.userBadge);
  }
}

// POST /api/prophecies/[id]/rate - Rate a prophecy
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  const { id } = await params;

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Validate rating value with Zod
    const validation = await validateBody(request, rateSchema);
    if (!validation.success) return validation.response;
    const { value } = validation.data;

    // Get prophecy with round info
    const prophecy = await prisma.prophecy.findUnique({
      where: { id },
      include: { round: true },
    });

    if (!prophecy) {
      return NextResponse.json({ error: 'Prophezeiung nicht gefunden' }, { status: 404 });
    }

    // Check if prophecy has been resolved
    if (prophecy.fulfilled !== null) {
      return NextResponse.json(
        { error: 'Aufgelöste Prophezeiungen können nicht mehr bewertet werden' },
        { status: 400 }
      );
    }

    // Check if user is trying to rate their own prophecy
    if (prophecy.creatorId === session.userId) {
      return NextResponse.json(
        { error: 'Du kannst deine eigene Prophezeiung nicht bewerten' },
        { status: 400 }
      );
    }

    // Check if rating deadline has passed
    const now = new Date();
    if (now > prophecy.round.ratingDeadline) {
      return NextResponse.json({ error: 'Bewertungsphase ist beendet' }, { status: 400 });
    }

    // Check if rating already exists
    const existingRating = await prisma.rating.findUnique({
      where: {
        prophecyId_userId: {
          prophecyId: id,
          userId: session.userId,
        },
      },
    });

    const isUpdate = !!existingRating;

    // Upsert rating (create or update)
    const rating = await prisma.rating.upsert({
      where: {
        prophecyId_userId: {
          prophecyId: id,
          userId: session.userId,
        },
      },
      create: {
        prophecyId: id,
        userId: session.userId,
        value,
      },
      update: {
        value,
      },
    });

    // Create audit log for rating change
    await createAuditLog({
      entityType: auditEntityTypeSchema.enum.RATING,
      entityId: rating.id,
      action: isUpdate ? AuditActions.UPDATE : AuditActions.CREATE,
      prophecyId: id,
      userId: session.userId,
      oldValue: existingRating ? { value: existingRating.value } : null,
      newValue: { value: rating.value },
    });

    // Check and award badges for the user (only on new ratings, not updates)
    if (!isUpdate) {
      const newBadges = await checkAndAwardBadges(session.userId);
      await checkClutchRaterBadge(session.userId, prophecy.round.ratingDeadline, now, newBadges);
      broadcastBadges(newBadges);
    }

    const prophecyData = transformProphecyToResponse(prophecy);

    const ratingData = {
      id: rating.id,
      value: rating.value,
      prophecyId: rating.prophecyId,
      userId: rating.userId,
      createdAt: rating.createdAt.toISOString(),
    };

    // Broadcast to all connected clients
    sseEmitter.broadcast({
      type: 'prophecy:updated',
      data: prophecyData,
    });

    sseEmitter.broadcast({
      type: isUpdate ? 'rating:updated' : 'rating:created',
      data: ratingData,
    });

    return NextResponse.json({
      prophecy: prophecyData,
      rating: ratingData,
    });
  } catch (error) {
    console.error('Error rating prophecy:', error);
    return NextResponse.json({ error: 'Fehler beim Bewerten der Prophezeiung' }, { status: 500 });
  }
}
