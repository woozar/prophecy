import { NextRequest, NextResponse } from 'next/server';

import { validateAdminSession } from '@/lib/auth/admin-validation';
import { prisma } from '@/lib/db/prisma';
import { generateRoundExcel } from '@/lib/export/excel';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/rounds/[id]/export - Export round as Excel (Admin only)
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const validation = await validateAdminSession();
  if (validation.error) return validation.error;

  const { id } = await params;

  try {
    // Get round with all prophecies and ratings
    const round = await prisma.round.findUnique({
      where: { id },
      include: {
        prophecies: {
          include: {
            creator: {
              select: {
                username: true,
                displayName: true,
              },
            },
            ratings: {
              include: {
                user: {
                  select: {
                    username: true,
                    displayName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!round) {
      return NextResponse.json({ error: 'Runde nicht gefunden' }, { status: 404 });
    }

    // Transform data for export
    const prophecies = round.prophecies.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      creatorUsername: p.creator.username,
      creatorDisplayName: p.creator.displayName,
      ratingCount: p.ratingCount,
      averageRating: p.averageRating,
      fulfilled: p.fulfilled,
      createdAt: p.createdAt,
    }));

    const ratings = round.prophecies.flatMap((p) =>
      p.ratings.map((r) => ({
        prophecyTitle: p.title,
        raterUsername: r.user.username,
        raterDisplayName: r.user.displayName,
        value: r.value,
        createdAt: r.createdAt,
      }))
    );

    // Generate Excel
    const buffer = await generateRoundExcel({
      round: {
        title: round.title,
        submissionDeadline: round.submissionDeadline,
        ratingDeadline: round.ratingDeadline,
        fulfillmentDate: round.fulfillmentDate,
      },
      prophecies,
      ratings,
    });

    // Create safe filename
    const safeTitle = round.title
      .replace(/[^a-zA-Z0-9\u00C0-\u00FF\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
    const filename = `${safeTitle}_Export.xlsx`;

    // Return as file download
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error exporting round:', error);
    return NextResponse.json({ error: 'Fehler beim Exportieren der Runde' }, { status: 500 });
  }
}
