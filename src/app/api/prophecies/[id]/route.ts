import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { sseEmitter } from '@/lib/sse/event-emitter';
import { updateProphecySchema } from '@/lib/schemas/prophecy';
import { Errors, handleApiError, getProphecyWithAccessCheck } from '@/lib/api';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/prophecies/[id] - Update own prophecy (only before submission deadline)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  return handleApiError(async () => {
    const session = await getSession();
    const { id } = await params;

    if (!session) {
      throw Errors.unauthorized();
    }

    // Access check - validates ownership and deadline (result not needed after ratings reset)
    await getProphecyWithAccessCheck(id, session.userId, {
      deadlineErrorMessage: 'Einreichungsfrist ist abgelaufen, Bearbeiten nicht mehr möglich',
    });

    const body = await request.json();
    const parsed = updateProphecySchema.safeParse(body);

    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.errors[0].message);
    }

    const { title, description } = parsed.data;

    // Delete all ratings for this prophecy (they become invalid after edit)
    await prisma.rating.deleteMany({
      where: { prophecyId: id },
    });

    const updatedProphecy = await prisma.prophecy.update({
      where: { id },
      data: {
        title,
        description,
        averageRating: null,
        ratingCount: 0,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    // Broadcast to all connected clients
    sseEmitter.broadcast({
      type: 'prophecy:updated',
      data: {
        ...updatedProphecy,
        averageRating: null,
        ratingCount: 0,
        userRating: null,
        isOwn: true,
      },
    });

    return NextResponse.json({
      prophecy: {
        ...updatedProphecy,
        averageRating: null,
        ratingCount: 0,
        userRating: null,
        isOwn: true,
      },
    });
  }, 'Error updating prophecy:');
}

// DELETE /api/prophecies/[id] - Delete own prophecy (only before submission deadline)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return handleApiError(async () => {
    const session = await getSession();
    const { id } = await params;

    if (!session) {
      throw Errors.unauthorized();
    }

    const prophecy = await getProphecyWithAccessCheck(id, session.userId, {
      deadlineErrorMessage: 'Einreichungsfrist ist abgelaufen, Löschen nicht mehr möglich',
    });

    await prisma.prophecy.delete({
      where: { id },
    });

    // Broadcast to all connected clients
    sseEmitter.broadcast({
      type: 'prophecy:deleted',
      data: { id, roundId: prophecy.roundId },
    });

    return NextResponse.json({ success: true });
  }, 'Error deleting prophecy:');
}
