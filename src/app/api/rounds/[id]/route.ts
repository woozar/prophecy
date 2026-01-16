import { NextRequest, NextResponse } from 'next/server';

import { validateBody } from '@/lib/api/validation';
import { validateAdminSession, validateSession } from '@/lib/auth/admin-validation';
import { prisma } from '@/lib/db/prisma';
import { updateRoundSchema } from '@/lib/schemas/round';
import { sseEmitter } from '@/lib/sse/event-emitter';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/rounds/[id] - Get a single round
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const validation = await validateSession();
  if (validation.error) return validation.error;

  const { id } = await params;

  try {
    const round = await prisma.round.findUnique({
      where: { id },
    });

    if (!round) {
      return NextResponse.json({ error: 'Runde nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json({ round });
  } catch (error) {
    console.error('Error fetching round:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Runde' }, { status: 500 });
  }
}

// PUT /api/rounds/[id] - Update a round (Admin only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const validation = await validateAdminSession();
  if (validation.error) return validation.error;

  const { id } = await params;

  try {
    // Validate request body with Zod
    const bodyValidation = await validateBody(request, updateRoundSchema);
    if (!bodyValidation.success) return bodyValidation.response;
    const { title, submissionDeadline, ratingDeadline, fulfillmentDate } = bodyValidation.data;

    const round = await prisma.round.update({
      where: { id },
      data: {
        title,
        submissionDeadline,
        ratingDeadline,
        fulfillmentDate,
      },
    });

    // Broadcast to all connected clients
    sseEmitter.broadcast({
      type: 'round:updated',
      data: round,
    });

    return NextResponse.json({ round });
  } catch (error) {
    console.error('Error updating round:', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren der Runde' }, { status: 500 });
  }
}

// DELETE /api/rounds/[id] - Delete a round (Admin only)
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const validation = await validateAdminSession();
  if (validation.error) return validation.error;

  const { id } = await params;

  try {
    await prisma.round.delete({
      where: { id },
    });

    // Broadcast to all connected clients
    sseEmitter.broadcast({
      type: 'round:deleted',
      data: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting round:', error);
    return NextResponse.json({ error: 'Fehler beim Löschen der Runde' }, { status: 500 });
  }
}
