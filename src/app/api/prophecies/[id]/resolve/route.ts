import { NextRequest, NextResponse } from 'next/server';

import { transformProphecyToResponse } from '@/lib/api/prophecy-transform';
import { validateBody } from '@/lib/api/validation';
import { validateAdminSession } from '@/lib/auth/admin-validation';
import { type AwardedUserBadge, awardBadge, checkAndAwardBadges } from '@/lib/badges/badge-service';
import { prisma } from '@/lib/db/prisma';
import { resolveSchema } from '@/lib/schemas/rating';
import { sseEmitter } from '@/lib/sse/event-emitter';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Check and award controversial/unanimous badges based on ratings
 */
async function checkRatingPatternBadges(
  prophecyId: string,
  creatorId: string,
  newBadges: AwardedUserBadge[]
): Promise<void> {
  const ratings = await prisma.rating.findMany({
    where: { prophecyId },
    include: { user: { select: { isBot: true } } },
  });
  const humanRatings = ratings.filter((r) => !r.user.isBot);
  if (humanRatings.length === 0) return;

  const values = humanRatings.map((r) => r.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const spread = maxVal - minVal;

  // Controversial: has ratings from -10 to +10
  if (minVal <= -10 && maxVal >= 10) {
    const result = await awardBadge(creatorId, 'special_controversial');
    if (result?.isNew) newBadges.push(result.userBadge);
  }

  // Unanimous: >5 ratings, all within ±2 range (spread ≤ 4)
  if (humanRatings.length > 5 && spread <= 4) {
    const result = await awardBadge(creatorId, 'special_unanimous');
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

// POST /api/prophecies/[id]/resolve - Mark a prophecy as fulfilled or not fulfilled (Admin only)
export async function POST(request: NextRequest, { params }: RouteParams) {
  const adminValidation = await validateAdminSession();
  if (adminValidation.error) return adminValidation.error;

  const { id } = await params;

  try {
    const validation = await validateBody(request, resolveSchema);
    if (!validation.success) return validation.response;
    const { fulfilled } = validation.data;

    const prophecy = await prisma.prophecy.findUnique({
      where: { id },
      include: { round: true },
    });

    if (!prophecy) {
      return NextResponse.json({ error: 'Prophezeiung nicht gefunden' }, { status: 404 });
    }

    if (new Date() <= prophecy.round.ratingDeadline) {
      return NextResponse.json(
        { error: 'Prophezeiungen können erst nach der Bewertungsphase aufgelöst werden' },
        { status: 400 }
      );
    }

    const updatedProphecy = await prisma.prophecy.update({
      where: { id },
      data: { fulfilled, resolvedAt: new Date() },
    });

    const newBadges = await checkAndAwardBadges(prophecy.creatorId);
    await checkRatingPatternBadges(id, prophecy.creatorId, newBadges);
    broadcastNewBadges(newBadges);

    const prophecyData = transformProphecyToResponse(updatedProphecy);
    sseEmitter.broadcast({ type: 'prophecy:updated', data: prophecyData });

    return NextResponse.json({ prophecy: prophecyData });
  } catch (error) {
    console.error('Error resolving prophecy:', error);
    return NextResponse.json({ error: 'Fehler beim Auflösen der Prophezeiung' }, { status: 500 });
  }
}
