import type { BadgeCategory, BadgeRarity } from '@prisma/client';
import { create } from 'zustand';

export interface Badge {
  id: string;
  key: string;
  name: string;
  description: string;
  requirement: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  threshold?: number | null;
  createdAt: string;
}

export interface UserBadge {
  id: string;
  badgeId: string;
  userId: string;
  earnedAt: string;
  badge: Badge;
}

// Simplified user badge for allUserBadges (without full badge data)
export interface UserBadgeSimple {
  userId: string;
  badgeId: string;
  earnedAt: string;
}

export interface AwardedBadge extends Badge {
  firstAchiever: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl?: string | null;
    avatarEffect?: string | null;
    avatarEffectColors?: string[];
  } | null;
  firstAchievedAt: string | null;
  totalAchievers: number;
}

interface BadgeState {
  // Alle Badge-Definitionen
  badges: Record<string, Badge>;

  // Badges des aktuellen Users
  myBadges: Record<string, UserBadge>;

  // Welche Badges hat welcher User? Für User-Profile (Badge-Icons anzeigen)
  // Map: userId -> badgeId -> UserBadgeSimple (leichtgewichtig, nur earnedAt)
  allUserBadges: Record<string, Record<string, UserBadgeSimple>>;

  // Hall of Fame: Welche Badges wurden vergeben, wer war Erster, wie viele haben ihn?
  // Enthält firstAchiever, firstAchievedAt, totalAchievers pro Badge
  awardedBadges: AwardedBadge[];

  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setBadges: (badges: Badge[]) => void;
  setMyBadges: (userBadges: UserBadge[]) => void;
  addMyBadge: (userBadge: UserBadge) => void;
  removeMyBadge: (badgeId: string) => void;
  setAllUserBadges: (userBadges: UserBadgeSimple[]) => void;
  addUserBadge: (userBadge: UserBadgeSimple) => void;
  removeUserBadge: (userId: string, badgeId: string) => void;
  setAwardedBadges: (badges: AwardedBadge[]) => void;
  setInitialized: (initialized: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useBadgeStore = create<BadgeState>((set) => ({
  badges: {},
  myBadges: {},
  allUserBadges: {},
  awardedBadges: [],
  isInitialized: false,
  isLoading: false,
  error: null,

  setBadges: (badges) =>
    set({
      badges: badges.reduce(
        (acc, badge) => {
          acc[badge.id] = badge;
          return acc;
        },
        {} as Record<string, Badge>
      ),
    }),

  setMyBadges: (userBadges) =>
    set({
      myBadges: userBadges.reduce(
        (acc, ub) => {
          acc[ub.badgeId] = ub;
          return acc;
        },
        {} as Record<string, UserBadge>
      ),
    }),

  addMyBadge: (userBadge) =>
    set((state) => ({
      myBadges: { ...state.myBadges, [userBadge.badgeId]: userBadge },
    })),

  removeMyBadge: (badgeId) =>
    set((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [badgeId]: _, ...rest } = state.myBadges;
      return { myBadges: rest };
    }),

  setAllUserBadges: (userBadges) =>
    set({
      allUserBadges: userBadges.reduce(
        (acc, ub) => {
          if (!acc[ub.userId]) {
            acc[ub.userId] = {};
          }
          acc[ub.userId][ub.badgeId] = ub;
          return acc;
        },
        {} as Record<string, Record<string, UserBadgeSimple>>
      ),
    }),

  addUserBadge: (userBadge) =>
    set((state) => {
      const existingUserBadges = state.allUserBadges[userBadge.userId] ?? {};
      return {
        allUserBadges: {
          ...state.allUserBadges,
          [userBadge.userId]: {
            ...existingUserBadges,
            [userBadge.badgeId]: userBadge,
          },
        },
      };
    }),

  removeUserBadge: (userId, badgeId) =>
    set((state) => {
      const existingUserBadges = state.allUserBadges[userId];
      if (!existingUserBadges) return state;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [badgeId]: _, ...rest } = existingUserBadges;
      return {
        allUserBadges: {
          ...state.allUserBadges,
          [userId]: rest,
        },
      };
    }),

  setAwardedBadges: (badges) => set({ awardedBadges: badges }),

  setInitialized: (isInitialized) => set({ isInitialized }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),
}));

// Selectors
export const selectBadgeById = (id: string) => (state: BadgeState) => state.badges[id];
export const selectAllBadges = (state: BadgeState) => Object.values(state.badges);
export const selectMyBadges = (state: BadgeState) => Object.values(state.myBadges);
export const selectMyBadgeIds = (state: BadgeState) => Object.keys(state.myBadges);
export const selectHasBadge = (badgeId: string) => (state: BadgeState) => !!state.myBadges[badgeId];

// Hall of Fame: Alle vergebenen Badges mit Statistiken (firstAchiever, totalAchievers)
export const selectAwardedBadges = (state: BadgeState) => state.awardedBadges;

// User-Profile: Welche Badges hat ein bestimmter User? (leichtgewichtig)
export const selectUserBadges = (userId: string) => (state: BadgeState) =>
  state.allUserBadges[userId] ? Object.values(state.allUserBadges[userId]) : [];

// Grouped selectors
export const selectMyBadgesByCategory = (category: BadgeCategory) => (state: BadgeState) =>
  Object.values(state.myBadges).filter((ub) => ub.badge.category === category);

export const selectAwardedBadgesByCategory = (category: BadgeCategory) => (state: BadgeState) =>
  state.awardedBadges.filter((b) => b.category === category);
