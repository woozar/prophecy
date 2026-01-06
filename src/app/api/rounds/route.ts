import { NextRequest, NextResponse } from 'next/server';

import { validateBody } from '@/lib/api/validation';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { createRoundSchema } from '@/lib/schemas/round';
import { sseEmitter } from '@/lib/sse/event-emitter';

// GET /api/rounds - Get all rounds
export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rounds = await prisma.round.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ rounds });
  } catch (error) {
    console.error('Error fetching rounds:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Runden' }, { status: 500 });
  }
}

// POST /api/rounds - Create a new round (Admin only)
export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Validate request body with Zod
    const validation = await validateBody(request, createRoundSchema);
    if (!validation.success) return validation.response;
    const { title, submissionDeadline, ratingDeadline, fulfillmentDate } = validation.data;

    const round = await prisma.round.create({
      data: {
        title,
        submissionDeadline,
        ratingDeadline,
        fulfillmentDate,
      },
    });

    // Broadcast to all connected clients
    sseEmitter.broadcast({
      type: 'round:created',
      data: round,
    });

    return NextResponse.json({ round }, { status: 201 });
  } catch (error) {
    console.error('Error creating round:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen der Runde' }, { status: 500 });
  }
}
