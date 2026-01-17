import { create } from 'zustand';

import type { ConnectionStatus } from '@/hooks/useSSE';

export interface User {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl?: string | null;
  avatarEffect?: string | null;
  avatarEffectColors?: string[];
  animationsEnabled?: boolean;
  role: string;
  status: string;
  isBot?: boolean;
  createdAt?: string;
  badgeIds?: string[];
}

interface UserState {
  users: Record<string, User>;
  currentUserId: string | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  connectionStatus: ConnectionStatus;

  // Actions
  setUsers: (users: User[]) => void;
  setUser: (user: User) => void;
  removeUser: (id: string) => void;
  setCurrentUserId: (id: string | null) => void;
  setInitialized: (initialized: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
}

export const useUserStore = create<UserState>((set) => ({
  users: {},
  currentUserId: null,
  isInitialized: false,
  isLoading: false,
  error: null,
  connectionStatus: 'disconnected',

  setUsers: (users) =>
    set({
      users: users.reduce(
        (acc, user) => {
          acc[user.id] = user;
          return acc;
        },
        {} as Record<string, User>
      ),
    }),

  setUser: (user) =>
    set((state) => {
      const existing = state.users[user.id];
      // Merge with existing user to preserve fields not in update (e.g., badgeIds)
      const mergedUser = existing ? { ...existing, ...user } : user;
      // Skip update if nothing changed
      if (
        existing &&
        existing.username === mergedUser.username &&
        existing.displayName === mergedUser.displayName &&
        existing.avatarUrl === mergedUser.avatarUrl &&
        existing.avatarEffect === mergedUser.avatarEffect &&
        JSON.stringify(existing.avatarEffectColors) ===
          JSON.stringify(mergedUser.avatarEffectColors) &&
        existing.animationsEnabled === mergedUser.animationsEnabled &&
        existing.role === mergedUser.role &&
        existing.status === mergedUser.status &&
        JSON.stringify(existing.badgeIds) === JSON.stringify(mergedUser.badgeIds)
      ) {
        return state;
      }
      return { users: { ...state.users, [mergedUser.id]: mergedUser } };
    }),

  removeUser: (id) =>
    set((state) => ({
      users: Object.fromEntries(Object.entries(state.users).filter(([key]) => key !== id)),
    })),

  setCurrentUserId: (id) => set({ currentUserId: id }),

  setInitialized: (isInitialized) => set({ isInitialized }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
}));

// Selectors (außerhalb des Stores für bessere Performance)
export const selectUserById = (id: string) => (state: UserState) => state.users[id];
export const selectCurrentUser = (state: UserState) =>
  state.currentUserId ? state.users[state.currentUserId] : undefined;
export const selectAllUsers = (state: UserState) => Object.values(state.users);
