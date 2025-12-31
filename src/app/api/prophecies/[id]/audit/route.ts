import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/prophecies/[id]/audit - Get audit logs for a prophecy
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  const { id } = await params;

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify prophecy exists
    const prophecy = await prisma.prophecy.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!prophecy) {
      return NextResponse.json({ error: 'Prophezeiung nicht gefunden' }, { status: 404 });
    }

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

    // Transform to response format
    const auditLogsResponse = auditLogs.map((log) => ({
      id: log.id,
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      prophecyId: log.prophecyId,
      userId: log.userId,
      oldValue: log.oldValue,
      newValue: log.newValue,
      context: log.context,
      createdAt: log.createdAt.toISOString(),
      user: log.user,
    }));

    return NextResponse.json({ auditLogs: auditLogsResponse });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Fehler beim Laden des Audit-Logs' }, { status: 500 });
  }
}
