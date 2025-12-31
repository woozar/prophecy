import { NextRequest, NextResponse } from 'next/server';

import { transformProphecyToResponse } from '@/lib/api/prophecy-transform';
import { validateBody } from '@/lib/api/validation';
import { createAuditLog } from '@/lib/audit/audit-service';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { createProphecySchema } from '@/lib/schemas/prophecy';
import { sseEmitter } from '@/lib/sse/event-emitter';

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
          where: { userId: session.userId },
          select: { value: true },
        },
        _count: {
          select: { ratings: true },
        },
      },
    });

    // Transform to include user's rating if exists
    const transformedProphecies = prophecies.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      createdAt: p.createdAt,
      creator: p.creator,
      averageRating: p.averageRating,
      ratingCount: p._count.ratings,
      userRating: p.ratings[0]?.value ?? null,
      isOwn: p.creatorId === session.userId,
      fulfilled: p.fulfilled,
      resolvedAt: p.resolvedAt,
    }));

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
    // Validate request body with Zod
    const validation = await validateBody(request, createProphecySchema);
    if (!validation.success) return validation.response;
    const { roundId, title, description } = validation.data;

    // Check if round exists and submission is still open
    const round = await prisma.round.findUnique({
      where: { id: roundId },
    });

    if (!round) {
      return NextResponse.json({ error: 'Runde nicht gefunden' }, { status: 404 });
    }

    if (new Date() > round.submissionDeadline) {
      return NextResponse.json({ error: 'Einreichungsfrist ist abgelaufen' }, { status: 400 });
    }

    const prophecy = await prisma.prophecy.create({
      data: {
        title,
        description,
        roundId,
        creatorId: session.userId,
      },
    });

    // Create audit log for prophecy creation
    await createAuditLog({
      entityType: 'PROPHECY',
      entityId: prophecy.id,
      action: 'CREATE',
      prophecyId: prophecy.id,
      userId: session.userId,
      newValue: { title, description },
    });

    const prophecyData = transformProphecyToResponse(prophecy);

    // Broadcast to all connected clients
    sseEmitter.broadcast({
      type: 'prophecy:created',
      data: prophecyData,
    });

    return NextResponse.json({ prophecy: prophecyData });
  } catch (error) {
    console.error('Error creating prophecy:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen der Prophezeiung' }, { status: 500 });
  }
}
