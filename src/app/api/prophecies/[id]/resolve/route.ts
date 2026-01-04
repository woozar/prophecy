import { NextRequest, NextResponse } from 'next/server';

import { transformProphecyToResponse } from '@/lib/api/prophecy-transform';
import { validateBody } from '@/lib/api/validation';
import { validateAdminSession } from '@/lib/auth/admin-validation';
import { checkAndAwardBadges } from '@/lib/badges/badge-service';
import { prisma } from '@/lib/db/prisma';
import { resolveSchema } from '@/lib/schemas/rating';
import { sseEmitter } from '@/lib/sse/event-emitter';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/prophecies/[id]/resolve - Mark a prophecy as fulfilled or not fulfilled (Admin only)
export async function POST(request: NextRequest, { params }: RouteParams) {
  const adminValidation = await validateAdminSession();
  if (adminValidation.error) return adminValidation.error;

  const { id } = await params;

  try {
    // Validate request body with Zod
    const validation = await validateBody(request, resolveSchema);
    if (!validation.success) return validation.response;
    const { fulfilled } = validation.data;

    // Get prophecy with round info
    const prophecy = await prisma.prophecy.findUnique({
      where: { id },
      include: { round: true },
    });

    if (!prophecy) {
      return NextResponse.json({ error: 'Prophezeiung nicht gefunden' }, { status: 404 });
    }

    // Check if rating deadline has passed
    const now = new Date();
    if (now <= prophecy.round.ratingDeadline) {
      return NextResponse.json(
        { error: 'Prophezeiungen können erst nach der Bewertungsphase aufgelöst werden' },
        { status: 400 }
      );
    }

    // Update prophecy with fulfilled status
    const updatedProphecy = await prisma.prophecy.update({
      where: { id },
      data: {
        fulfilled,
        resolvedAt: now,
      },
    });

    // Check and award badges for the prophecy creator (not the admin resolving it)
    const newBadges = await checkAndAwardBadges(prophecy.creatorId);

    // Broadcast new badges via SSE
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

    const prophecyData = transformProphecyToResponse(updatedProphecy);

    // Broadcast to all connected clients
    sseEmitter.broadcast({
      type: 'prophecy:updated',
      data: prophecyData,
    });

    return NextResponse.json({ prophecy: prophecyData });
  } catch (error) {
    console.error('Error resolving prophecy:', error);
    return NextResponse.json({ error: 'Fehler beim Auflösen der Prophezeiung' }, { status: 500 });
  }
}
