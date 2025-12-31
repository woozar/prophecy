import { NextRequest, NextResponse } from 'next/server';

import { transformProphecyToResponse } from '@/lib/api/prophecy-transform';
import { validateBody } from '@/lib/api/validation';
import { createAuditLog } from '@/lib/audit/audit-service';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { rateSchema } from '@/lib/schemas/rating';
import { sseEmitter } from '@/lib/sse/event-emitter';

interface RouteParams {
  params: Promise<{ id: string }>;
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
      entityType: 'RATING',
      entityId: rating.id,
      action: isUpdate ? 'UPDATE' : 'CREATE',
      prophecyId: id,
      userId: session.userId,
      oldValue: existingRating ? { value: existingRating.value } : null,
      newValue: { value: rating.value },
    });

    // Recalculate average rating (excluding value=0 which means "unrated")
    const ratings = await prisma.rating.findMany({
      where: { prophecyId: id },
      select: { value: true },
    });

    // Filter out zero-value ratings (unrated)
    const nonZeroRatings = ratings.filter((r) => r.value !== 0);
    const ratingCount = nonZeroRatings.length;
    const averageRating =
      ratingCount > 0 ? nonZeroRatings.reduce((sum, r) => sum + r.value, 0) / ratingCount : null;

    // Update prophecy with new average
    const updatedProphecy = await prisma.prophecy.update({
      where: { id },
      data: {
        averageRating,
        ratingCount,
      },
    });

    const prophecyData = transformProphecyToResponse(updatedProphecy);

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
