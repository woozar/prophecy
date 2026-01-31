import { NextRequest, NextResponse } from 'next/server';

import { Errors, getProphecyWithAccessCheck, handleApiError } from '@/lib/api';
import { transformProphecyToResponse } from '@/lib/api/prophecy-transform';
import { createAuditLog } from '@/lib/audit/audit-service';
import { getSession } from '@/lib/auth/session';
import { awardBadge, awardContentCategoryBadges } from '@/lib/badges/badge-service';
import { prisma } from '@/lib/db/prisma';
import { AuditActions, auditEntityTypeSchema } from '@/lib/schemas/audit';
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
      checkResolved: true,
      deadlineErrorMessage: 'Einreichungsfrist ist abgelaufen, Bearbeiten nicht mehr möglich',
    });

    const body = await request.json();
    const parsed = updateProphecySchema.safeParse(body);

    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.errors[0].message);
    }

    const { title, description } = parsed.data;

    // Check if anything actually changed
    const titleChanged = title !== oldProphecy.title;
    const descriptionChanged = description !== oldProphecy.description;

    if (!titleChanged && !descriptionChanged) {
      // Nothing changed - return current state without any side effects
      const prophecyData = transformProphecyToResponse(oldProphecy);
      return NextResponse.json({ prophecy: prophecyData });
    }

    // Capture ratings before deletion for audit log
    const ratingsToDelete = await prisma.rating.findMany({
      where: { prophecyId: id },
      select: { id: true, value: true, userId: true },
    });

    // Delete all ratings for this prophecy (they become invalid after edit)
    await prisma.rating.deleteMany({
      where: { prophecyId: id },
    });

    // Notify clients about deleted ratings
    for (const rating of ratingsToDelete) {
      sseEmitter.broadcast({
        type: 'rating:deleted',
        data: { id: rating.id },
      });
    }

    const updatedProphecy = await prisma.prophecy.update({
      where: { id },
      data: {
        title,
        description,
      },
    });

    // Create audit log for bulk rating deletion if any ratings were deleted
    if (ratingsToDelete.length > 0) {
      await createAuditLog({
        entityType: auditEntityTypeSchema.enum.RATING,
        entityId: id,
        action: AuditActions.BULK_DELETE,
        prophecyId: id,
        userId: session.userId,
        oldValue: { count: ratingsToDelete.length, ratings: ratingsToDelete },
        context: 'Prophezeiung wurde bearbeitet - alle Bewertungen zurückgesetzt',
      });
    }

    // Create audit log for prophecy update
    const deletedRatingsCount = ratingsToDelete.length;
    const ratingPlural = deletedRatingsCount === 1 ? '' : 'en';
    const auditContext =
      deletedRatingsCount > 0
        ? `${deletedRatingsCount} Bewertung${ratingPlural} zurückgesetzt`
        : undefined;

    await createAuditLog({
      entityType: auditEntityTypeSchema.enum.PROPHECY,
      entityId: id,
      action: AuditActions.UPDATE,
      prophecyId: id,
      userId: session.userId,
      oldValue: { title: oldProphecy.title, description: oldProphecy.description },
      newValue: { title, description },
      context: auditContext,
    });

    const prophecyData = transformProphecyToResponse(updatedProphecy);

    // Broadcast to all connected clients
    sseEmitter.broadcast({
      type: 'prophecy:updated',
      data: prophecyData,
    });

    // Award "Perfektionist" badge for editing a prophecy
    const badgeResult = await awardBadge(session.userId, 'special_perfectionist');
    if (badgeResult?.isNew) {
      sseEmitter.broadcast({
        type: 'badge:awarded',
        data: {
          id: badgeResult.userBadge.id,
          earnedAt: badgeResult.userBadge.earnedAt.toISOString(),
          userId: badgeResult.userBadge.userId,
          badgeId: badgeResult.userBadge.badgeId,
          badge: badgeResult.userBadge.badge,
        },
      });
    }

    // Award "Romanschreiber" badge for long description
    if (description.length >= 500) {
      const novelistResult = await awardBadge(session.userId, 'special_novelist');
      if (novelistResult?.isNew) {
        sseEmitter.broadcast({
          type: 'badge:awarded',
          data: {
            id: novelistResult.userBadge.id,
            earnedAt: novelistResult.userBadge.earnedAt.toISOString(),
            userId: novelistResult.userBadge.userId,
            badgeId: novelistResult.userBadge.badgeId,
            badge: novelistResult.userBadge.badge,
          },
        });
      }
    }

    // Fire-and-forget content analysis - don't await
    awardContentCategoryBadges(session.userId, title, description).then(async (result) => {
      for (const userBadge of result.badges) {
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

      // Log content analysis result to audit log (as Kimberly)
      if (result.analysis) {
        const kimberly = await prisma.user.findUnique({ where: { username: 'kimberly' } });
        const categories = result.analysis.categories;
        const categoryText =
          categories.length > 0
            ? `Kategorien: ${categories.join(', ')}`
            : 'Keine Kategorie erkannt';

        await createAuditLog({
          entityType: auditEntityTypeSchema.enum.PROPHECY,
          entityId: id,
          action: AuditActions.ANALYZE,
          prophecyId: id,
          userId: kimberly?.id ?? session.userId,
          newValue: {
            contentAnalysis: {
              categories: result.analysis.categories,
              confidence: Math.round(result.analysis.confidence * 100),
              reasoning: result.analysis.reasoning,
            },
          },
          context: `${categoryText} (${Math.round(result.analysis.confidence * 100)}% Konfidenz). ${result.analysis.reasoning}`,
        });

        // Notify clients that audit log was updated
        sseEmitter.broadcast({
          type: 'auditLog:created',
          data: { prophecyId: id },
        });
      }
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
      checkResolved: true,
      deadlineErrorMessage: 'Einreichungsfrist ist abgelaufen, Löschen nicht mehr möglich',
    });

    // Create audit log before deletion (prophecyId will be set to null after delete due to onDelete: SetNull)
    await createAuditLog({
      entityType: auditEntityTypeSchema.enum.PROPHECY,
      entityId: id,
      action: AuditActions.DELETE,
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

    // Award "Reue" badge for deleting a prophecy
    const badgeResult = await awardBadge(session.userId, 'special_regret');
    if (badgeResult?.isNew) {
      sseEmitter.broadcast({
        type: 'badge:awarded',
        data: {
          id: badgeResult.userBadge.id,
          earnedAt: badgeResult.userBadge.earnedAt.toISOString(),
          userId: badgeResult.userBadge.userId,
          badgeId: badgeResult.userBadge.badgeId,
          badge: badgeResult.userBadge.badge,
        },
      });
    }

    return NextResponse.json({ success: true });
  }, 'Error deleting prophecy:');
}
