import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { auditEntityTypeSchema } from '@/lib/schemas/audit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Removes rating values from audit log entries if the rating deadline hasn't passed.
 * This prevents users from seeing how others rated before the deadline.
 */
function maskRatingValues(
  value: string | null,
  isRatingEntry: boolean,
  isAfterRatingDeadline: boolean
): string | null {
  if (!value || !isRatingEntry || isAfterRatingDeadline) {
    return value;
  }

  try {
    const parsed = JSON.parse(value);
    // Remove the 'value' field but keep other fields like userId, count, ratings
    if ('value' in parsed) {
      const { value: _, ...rest } = parsed;
      return JSON.stringify(rest);
    }
    // For bulk delete, mask the values in the ratings array
    if ('ratings' in parsed && Array.isArray(parsed.ratings)) {
      const maskedRatings = parsed.ratings.map(
        ({ value: _, ...rest }: { value: number; [key: string]: unknown }) => rest
      );
      return JSON.stringify({ ...parsed, ratings: maskedRatings });
    }
    return value;
  } catch {
    return value;
  }
}

// GET /api/prophecies/[id]/audit - Get audit logs for a prophecy
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  const { id } = await params;

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify prophecy exists and get round info for deadline check
    const prophecy = await prisma.prophecy.findUnique({
      where: { id },
      select: {
        id: true,
        round: {
          select: {
            ratingDeadline: true,
          },
        },
      },
    });

    if (!prophecy) {
      return NextResponse.json({ error: 'Prophezeiung nicht gefunden' }, { status: 404 });
    }

    const isAfterRatingDeadline = prophecy.round.ratingDeadline < new Date();

    // Get audit logs for this prophecy
    const auditLogs = await prisma.auditLog.findMany({
      where: { prophecyId: id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform to response format, masking rating values if deadline hasn't passed
    const auditLogsResponse = auditLogs.map((log) => {
      const isRatingEntry = log.entityType === auditEntityTypeSchema.enum.RATING;

      return {
        id: log.id,
        entityType: log.entityType,
        entityId: log.entityId,
        action: log.action,
        prophecyId: log.prophecyId,
        userId: log.userId,
        oldValue: maskRatingValues(log.oldValue, isRatingEntry, isAfterRatingDeadline),
        newValue: maskRatingValues(log.newValue, isRatingEntry, isAfterRatingDeadline),
        context: log.context,
        createdAt: log.createdAt.toISOString(),
        user: log.user,
      };
    });

    return NextResponse.json({ auditLogs: auditLogsResponse });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Fehler beim Laden des Audit-Logs' }, { status: 500 });
  }
}
