import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { sseEmitter } from "@/lib/sse/event-emitter";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function validateAdminSession() {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { status: true },
  });
  if (currentUser?.status !== "APPROVED") {
    return { error: NextResponse.json({ error: "Dein Account ist gesperrt" }, { status: 403 }) };
  }
  return { session };
}

async function canModifyAdmin(targetId: string): Promise<boolean> {
  const targetUser = await prisma.user.findUnique({
    where: { id: targetId },
    select: { role: true },
  });
  if (targetUser?.role !== "ADMIN") return true;
  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  return adminCount > 1;
}

// PUT /api/admin/users/[id] - Update a user (Admin only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const validation = await validateAdminSession();
  if (validation.error) return validation.error;
  const { session } = validation;

  const { id } = await params;

  try {
    const body = await request.json();
    const { status, role } = body;

    if (id === session.userId && status === "SUSPENDED") {
      return NextResponse.json(
        { error: "Du kannst dich nicht selbst sperren" },
        { status: 400 }
      );
    }

    if (id === session.userId && role && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Du kannst deine eigene Rolle nicht ändern" },
        { status: 400 }
      );
    }

    if (role && role !== "ADMIN" && !(await canModifyAdmin(id))) {
      return NextResponse.json(
        { error: "Der letzte Admin kann nicht degradiert werden" },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(role && { role }),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            prophecies: true,
            ratings: true,
          },
        },
      },
    });

    // Broadcast to all connected clients
    sseEmitter.broadcast({
      type: "user:updated",
      data: user,
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren des Benutzers" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Delete a user (Admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const validation = await validateAdminSession();
  if (validation.error) return validation.error;
  const { session } = validation;

  const { id } = await params;

  if (id === session.userId) {
    return NextResponse.json(
      { error: "Du kannst dich nicht selbst löschen" },
      { status: 400 }
    );
  }

  try {
    if (!(await canModifyAdmin(id))) {
      return NextResponse.json(
        { error: "Der letzte Admin kann nicht gelöscht werden" },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    sseEmitter.broadcast({
      type: "user:deleted",
      data: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen des Benutzers" },
      { status: 500 }
    );
  }
}
