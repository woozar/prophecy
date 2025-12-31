import { NextRequest, NextResponse } from 'next/server';

import { Errors, getProphecyWithAccessCheck, handleApiError } from '@/lib/api';
import { transformProphecyToResponse } from '@/lib/api/prophecy-transform';
import { createAuditLog } from '@/lib/audit/audit-service';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { updateProphecySchema } from '@/lib/schemas/prophecy';
import { sseEmitter } from '@/lib/sse/event-emitter';

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

    // Access check - validates ownership and deadline
    const oldProphecy = await getProphecyWithAccessCheck(id, session.userId, {
      deadlineErrorMessage: 'Einreichungsfrist ist abgelaufen, Bearbeiten nicht mehr möglich',
    });

    const body = await request.json();
    const parsed = updateProphecySchema.safeParse(body);

    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.errors[0].message);
    }

    const { title, description } = parsed.data;

    // Capture ratings before deletion for audit log
    const ratingsToDelete = await prisma.rating.findMany({
      where: { prophecyId: id },
      select: { id: true, value: true, userId: true },
    });

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
    });

    // Create audit log for bulk rating deletion if any ratings were deleted
    if (ratingsToDelete.length > 0) {
      await createAuditLog({
        entityType: 'RATING',
        entityId: id,
        action: 'BULK_DELETE',
        prophecyId: id,
        userId: session.userId,
        oldValue: { count: ratingsToDelete.length, ratings: ratingsToDelete },
        context: 'Prophezeiung wurde bearbeitet - alle Bewertungen zurückgesetzt',
      });
    }

    // Create audit log for prophecy update
    await createAuditLog({
      entityType: 'PROPHECY',
      entityId: id,
      action: 'UPDATE',
      prophecyId: id,
      userId: session.userId,
      oldValue: { title: oldProphecy.title, description: oldProphecy.description },
      newValue: { title, description },
      context:
        ratingsToDelete.length > 0
          ? `${ratingsToDelete.length} Bewertung${ratingsToDelete.length !== 1 ? 'en' : ''} zurückgesetzt`
          : undefined,
    });

    const prophecyData = transformProphecyToResponse(updatedProphecy);

    // Broadcast to all connected clients
    sseEmitter.broadcast({
      type: 'prophecy:updated',
      data: prophecyData,
    });

    return NextResponse.json({ prophecy: prophecyData });
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

    // Create audit log before deletion (prophecyId will be set to null after delete due to onDelete: SetNull)
    await createAuditLog({
      entityType: 'PROPHECY',
      entityId: id,
      action: 'DELETE',
      prophecyId: id,
      userId: session.userId,
      oldValue: { title: prophecy.title, description: prophecy.description },
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
