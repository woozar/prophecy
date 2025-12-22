import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { sseEmitter } from "@/lib/sse/event-emitter";
import { updateProphecySchema } from "@/lib/schemas/prophecy";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/prophecies/[id] - Update own prophecy (only before submission deadline)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  const { id } = await params;

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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

    // Check if user owns the prophecy
    if (prophecy.creatorId !== session.userId) {
      return NextResponse.json(
        { error: "Keine Berechtigung" },
        { status: 403 }
      );
    }

    // Check if submission deadline has passed
    if (new Date() > prophecy.round.submissionDeadline) {
      return NextResponse.json(
        { error: "Einreichungsfrist ist abgelaufen, Bearbeiten nicht mehr möglich" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = updateProphecySchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    const { title, description } = parsed.data;

    const updatedProphecy = await prisma.prophecy.update({
      where: { id },
      data: { title, description },
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
      type: "prophecy:updated",
      data: {
        ...updatedProphecy,
        averageRating: prophecy.averageRating,
        ratingCount: 0,
        userRating: null,
        isOwn: true,
      },
    });

    return NextResponse.json({
      prophecy: {
        ...updatedProphecy,
        averageRating: prophecy.averageRating,
        ratingCount: 0,
        userRating: null,
        isOwn: true,
      },
    });
  } catch (error) {
    console.error("Error updating prophecy:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren der Prophezeiung" },
      { status: 500 }
    );
  }
}

// DELETE /api/prophecies/[id] - Delete own prophecy (only before submission deadline)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  const { id } = await params;

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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

    // Check if user owns the prophecy
    if (prophecy.creatorId !== session.userId) {
      return NextResponse.json(
        { error: "Keine Berechtigung" },
        { status: 403 }
      );
    }

    // Check if submission deadline has passed
    if (new Date() > prophecy.round.submissionDeadline) {
      return NextResponse.json(
        { error: "Einreichungsfrist ist abgelaufen, Löschen nicht mehr möglich" },
        { status: 400 }
      );
    }

    await prisma.prophecy.delete({
      where: { id },
    });

    // Broadcast to all connected clients
    sseEmitter.broadcast({
      type: "prophecy:deleted",
      data: { id, roundId: prophecy.roundId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting prophecy:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen der Prophezeiung" },
      { status: 500 }
    );
  }
}
