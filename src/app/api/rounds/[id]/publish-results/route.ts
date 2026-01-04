import { NextRequest, NextResponse } from 'next/server';

import { validateAdminSession } from '@/lib/auth/admin-validation';
import { awardLeaderboardBadges } from '@/lib/badges/badge-service';
import { prisma } from '@/lib/db/prisma';
import { sseEmitter } from '@/lib/sse/event-emitter';
import { calculateRoundStatistics } from '@/lib/statistics/calculate';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/rounds/[id]/publish-results - Publish results for a round (Admin only)
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const validation = await validateAdminSession();
  if (validation.error) return validation.error;

  const { id } = await params;

  try {
    // Get round
    const round = await prisma.round.findUnique({
      where: { id },
    });

    if (!round) {
      return NextResponse.json({ error: 'Runde nicht gefunden' }, { status: 404 });
    }

    // Check if rating deadline has passed
    const now = new Date();
    if (now <= round.ratingDeadline) {
      return NextResponse.json(
        { error: 'Ergebnisse können erst nach der Bewertungsphase veröffentlicht werden' },
        { status: 400 }
      );
    }

    // Check if already published
    if (round.resultsPublishedAt) {
      return NextResponse.json(
        { error: 'Ergebnisse wurden bereits veröffentlicht' },
        { status: 400 }
      );
    }

    // Update round with resultsPublishedAt
    const updatedRound = await prisma.round.update({
      where: { id },
      data: {
        resultsPublishedAt: now,
      },
    });

    // Calculate statistics and award leaderboard badges
    const statistics = await calculateRoundStatistics(id);
    const creatorLeaderboard = statistics.creatorStats.map((s) => ({ userId: s.userId }));

    // Count first-place wins for champion badges
    let firstPlaceWinCount: number | undefined;
    if (creatorLeaderboard[0]) {
      const winnerId = creatorLeaderboard[0].userId;
      // Count rounds where this user was in first place (by checking their score vs others)
      // For simplicity, we count published rounds where they have the highest score
      const publishedRounds = await prisma.round.findMany({
        where: { resultsPublishedAt: { not: null } },
        select: { id: true },
      });

      let winCount = 0;
      for (const r of publishedRounds) {
        const roundStats = await calculateRoundStatistics(r.id);
        if (roundStats.creatorStats[0]?.userId === winnerId) {
          winCount++;
        }
      }
      firstPlaceWinCount = winCount;
    }

    const awardedBadges = await awardLeaderboardBadges(creatorLeaderboard, firstPlaceWinCount);

    // Broadcast badge awards via SSE
    for (const badge of awardedBadges) {
      sseEmitter.broadcast({
        type: 'badge:awarded',
        data: {
          userId: badge.userId,
          badge: badge.badge,
          earnedAt: badge.earnedAt.toISOString(),
        },
      });
    }

    const roundData = {
      id: updatedRound.id,
      title: updatedRound.title,
      submissionDeadline: updatedRound.submissionDeadline.toISOString(),
      ratingDeadline: updatedRound.ratingDeadline.toISOString(),
      fulfillmentDate: updatedRound.fulfillmentDate.toISOString(),
      resultsPublishedAt: updatedRound.resultsPublishedAt?.toISOString() ?? null,
      createdAt: updatedRound.createdAt.toISOString(),
    };

    // Broadcast to all connected clients
    sseEmitter.broadcast({
      type: 'round:updated',
      data: roundData,
    });

    return NextResponse.json({ round: roundData, awardedBadges: awardedBadges.length });
  } catch (error) {
    console.error('Error publishing results:', error);
    return NextResponse.json(
      { error: 'Fehler beim Veröffentlichen der Ergebnisse' },
      { status: 500 }
    );
  }
}

// DELETE /api/rounds/[id]/publish-results - Unpublish results for a round (Admin only)
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const validation = await validateAdminSession();
  if (validation.error) return validation.error;

  const { id } = await params;

  try {
    // Get round
    const round = await prisma.round.findUnique({
      where: { id },
    });

    if (!round) {
      return NextResponse.json({ error: 'Runde nicht gefunden' }, { status: 404 });
    }

    // Check if results are published
    if (!round.resultsPublishedAt) {
      return NextResponse.json({ error: 'Ergebnisse sind nicht veröffentlicht' }, { status: 400 });
    }

    // Update round to remove resultsPublishedAt
    const updatedRound = await prisma.round.update({
      where: { id },
      data: {
        resultsPublishedAt: null,
      },
    });

    const roundData = {
      id: updatedRound.id,
      title: updatedRound.title,
      submissionDeadline: updatedRound.submissionDeadline.toISOString(),
      ratingDeadline: updatedRound.ratingDeadline.toISOString(),
      fulfillmentDate: updatedRound.fulfillmentDate.toISOString(),
      resultsPublishedAt: null,
      createdAt: updatedRound.createdAt.toISOString(),
    };

    // Broadcast to all connected clients
    sseEmitter.broadcast({
      type: 'round:updated',
      data: roundData,
    });

    return NextResponse.json({ round: roundData });
  } catch (error) {
    console.error('Error unpublishing results:', error);
    return NextResponse.json({ error: 'Fehler beim Zurückziehen der Ergebnisse' }, { status: 500 });
  }
}
