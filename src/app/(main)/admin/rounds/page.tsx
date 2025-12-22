import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { RoundsManager } from "@/components/admin/RoundsManager";

export default async function AdminRoundsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    redirect("/");
  }

  const rounds = await prisma.round.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { prophecies: true },
      },
    },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Runden-Verwaltung</h1>
      <RoundsManager
        initialRounds={rounds.map((r) => ({
          id: r.id,
          title: r.title,
          submissionDeadline: r.submissionDeadline.toISOString(),
          ratingDeadline: r.ratingDeadline.toISOString(),
          fulfillmentDate: r.fulfillmentDate.toISOString(),
          createdAt: r.createdAt.toISOString(),
          _count: r._count,
        }))}
      />
    </div>
  );
}
