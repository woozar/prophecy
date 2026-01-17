import { Prisma } from '@prisma/client';

/**
 * Zentrale Select-Definition für User-Objekte.
 * Wird bei allen User-Updates verwendet, um konsistente Daten zu gewährleisten.
 */
export const userSelectForBroadcast = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  avatarEffect: true,
  avatarEffectColors: true,
  animationsEnabled: true,
  role: true,
  status: true,
  createdAt: true,
  badges: {
    select: { badgeId: true },
  },
} satisfies Prisma.UserSelect;

type UserWithBadgeRelation = Prisma.UserGetPayload<{ select: typeof userSelectForBroadcast }>;

export interface UserForBroadcast {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  avatarEffect: string | null;
  avatarEffectColors: string | null;
  animationsEnabled: boolean;
  role: string;
  status: string;
  createdAt: Date;
  badgeIds: string[];
}

/**
 * Transformiert einen User mit Badge-Relation zu einem User mit badgeIds Array.
 */
export function transformUserForBroadcast(user: UserWithBadgeRelation): UserForBroadcast {
  const { badges, ...rest } = user;
  return {
    ...rest,
    badgeIds: badges.map((b) => b.badgeId),
  };
}
