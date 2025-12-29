import { NextRequest, NextResponse } from 'next/server';

import { transformProphecyToResponse } from '@/lib/api/prophecy-transform';
import { validateAdminSession } from '@/lib/auth/admin-validation';
import { prisma } from '@/lib/db/prisma';
import { sseEmitter } from '@/lib/sse/event-emitter';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/prophecies/[id]/resolve - Mark a prophecy as fulfilled or not fulfilled (Admin only)
export async function POST(request: NextRequest, { params }: RouteParams) {
  const validation = await validateAdminSession();
  if (validation.error) return validation.error;

  const { id } = await params;

  try {
    const body = await request.json();
    const { fulfilled } = body;

    if (typeof fulfilled !== 'boolean') {
      return NextResponse.json({ error: 'fulfilled muss ein Boolean sein' }, { status: 400 });
    }

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
