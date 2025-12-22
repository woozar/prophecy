import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { RoundDetailClient } from "./RoundDetailClient";

interface PageProps {
  readonly params: Promise<{ id: string }>;
}

export default async function RoundDetailPage({ params }: Readonly<PageProps>) {
  const session = await getSession();
  const { id } = await params;

  if (!session) {
    notFound();
  }

  // Load round with prophecies
  const round = await prisma.round.findUnique({
    where: { id },
    include: {
      prophecies: {
        orderBy: { createdAt: "desc" },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
          ratings: {
            where: { userId: session.userId },
            select: { value: true },
          },
          _count: {
            select: { ratings: true },
          },
        },
      },
    },
  });

  if (!round) {
    notFound();
  }

  // Transform prophecies
  const prophecies = round.prophecies.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    createdAt: p.createdAt.toISOString(),
    creator: p.creator,
    averageRating: p.averageRating,
    ratingCount: p._count.ratings,
    userRating: p.ratings[0]?.value ?? null,
    isOwn: p.creatorId === session.userId,
    fulfilled: p.fulfilled,
    resolvedAt: p.resolvedAt?.toISOString() ?? null,
  }));

  const roundData = {
    id: round.id,
    title: round.title,
    submissionDeadline: round.submissionDeadline.toISOString(),
    ratingDeadline: round.ratingDeadline.toISOString(),
    fulfillmentDate: round.fulfillmentDate.toISOString(),
  };

  return (
    <RoundDetailClient
      round={roundData}
      initialProphecies={prophecies}
      currentUserId={session.userId}
    />
  );
}
