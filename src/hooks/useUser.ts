import { useUserStore, type User } from '@/store/useUserStore';
import { useShallow } from 'zustand/shallow';

/**
 * Hook to get a user by ID from the store.
 * Only re-renders when the specific user's data changes.
 */
export function useUser(userId: string | undefined): User | undefined {
  return useUserStore(useShallow((state) => (userId ? state.users[userId] : undefined)));
}

/**
 * Hook to get the current logged-in user from the store.
 * Only re-renders when the current user's data changes.
 */
export function useCurrentUser(): User | undefined {
  return useUserStore(
    useShallow((state) => (state.currentUserId ? state.users[state.currentUserId] : undefined))
  );
}
