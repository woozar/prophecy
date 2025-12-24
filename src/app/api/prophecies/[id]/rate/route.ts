import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { sseEmitter } from "@/lib/sse/event-emitter";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/prophecies/[id]/rate - Rate a prophecy
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  const { id } = await params;

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { value } = body;

    // Validate rating value (-10 to +10)
    if (typeof value !== "number" || value < -10 || value > 10) {
      return NextResponse.json(
        { error: "Bewertung muss zwischen -10 und +10 liegen" },
        { status: 400 }
      );
    }

    // Get prophecy with round info
    const prophecy = await prisma.prophecy.findUnique({
      where: { id },
      include: { round: true },
    });

    if (!prophecy) {
      return NextResponse.json(
        { error: "Prophezeiung nicht gefunden" },
        { status: 404 }
      );
    }

    // Check if user is trying to rate their own prophecy
    if (prophecy.creatorId === session.userId) {
      return NextResponse.json(
        { error: "Du kannst deine eigene Prophezeiung nicht bewerten" },
        { status: 400 }
      );
    }

    // Check if rating deadline has passed
    const now = new Date();
    if (now > prophecy.round.ratingDeadline) {
      return NextResponse.json(
        { error: "Bewertungsphase ist beendet" },
        { status: 400 }
      );
    }

    // Upsert rating (create or update)
    await prisma.rating.upsert({
      where: {
        prophecyId_userId: {
          prophecyId: id,
          userId: session.userId,
        },
      },
      create: {
        prophecyId: id,
        userId: session.userId,
        value,
      },
      update: {
        value,
      },
    });

    // Recalculate average rating
    const ratings = await prisma.rating.findMany({
      where: { prophecyId: id },
      select: { value: true },
    });

    const ratingCount = ratings.length;
    const averageRating =
      ratingCount > 0
        ? ratings.reduce((sum, r) => sum + r.value, 0) / ratingCount
        : null;

    // Update prophecy with new average
    const updatedProphecy = await prisma.prophecy.update({
      where: { id },
      data: {
        averageRating,
        ratingCount,
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
      type: "prophecy:rated",
      data: {
        id: updatedProphecy.id,
        roundId: updatedProphecy.roundId,
        averageRating: updatedProphecy.averageRating,
        ratingCount: updatedProphecy.ratingCount,
      },
    });

    return NextResponse.json({
      prophecy: {
        ...updatedProphecy,
        userRating: value,
        isOwn: false,
      },
    });
  } catch (error) {
    console.error("Error rating prophecy:", error);
    return NextResponse.json(
      { error: "Fehler beim Bewerten der Prophezeiung" },
      { status: 500 }
    );
  }
}
