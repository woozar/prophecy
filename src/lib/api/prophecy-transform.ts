import type { Prophecy } from '@prisma/client';

export interface ProphecyResponse {
  id: string;
  title: string;
  description: string | null;
  creatorId: string;
  roundId: string;
  createdAt: string;
  fulfilled: boolean | null;
  resolvedAt: string | null;
}

export function transformProphecyToResponse(prophecy: Prophecy): ProphecyResponse {
  return {
    id: prophecy.id,
    title: prophecy.title,
    description: prophecy.description,
    creatorId: prophecy.creatorId,
    roundId: prophecy.roundId,
    createdAt: prophecy.createdAt.toISOString(),
    fulfilled: prophecy.fulfilled,
    resolvedAt: prophecy.resolvedAt?.toISOString() ?? null,
  };
}
