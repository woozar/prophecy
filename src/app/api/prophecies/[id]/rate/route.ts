import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { sseEmitter } from '@/lib/sse/event-emitter';
import { transformProphecyToResponse } from '@/lib/api/prophecy-transform';

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
    const body = await request.json();
    const { value } = body;

    // Validate rating value (-10 to +10)
    if (typeof value !== 'number' || value < -10 || value > 10) {
      return NextResponse.json(
        { error: 'Bewertung muss zwischen -10 und +10 liegen' },
        { status: 400 }
      );
    }

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
