'use client';

import {
  type ReactNode,
  createContext,
  memo,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { UserProfileModal } from '@/components/UserProfileModal';
import type { User } from '@/store/useUserStore';

interface UserProfileModalContextValue {
  openUserProfile: (user: User) => void;
  closeUserProfile: () => void;
}

export const UserProfileModalContext = createContext<UserProfileModalContextValue | null>(null);

export function useUserProfileModal(): UserProfileModalContextValue {
  const context = useContext(UserProfileModalContext);
  if (!context) {
    throw new Error('useUserProfileModal must be used within a UserProfileModalProvider');
  }
  return context;
}

interface UserProfileModalProviderProps {
  children: ReactNode;
}

export const UserProfileModalProvider = memo(function UserProfileModalProvider({
  children,
}: Readonly<UserProfileModalProviderProps>) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const openUserProfile = useCallback((user: User) => {
    setSelectedUser(user);
  }, []);

  const closeUserProfile = useCallback(() => {
    setSelectedUser(null);
  }, []);

  const contextValue = useMemo(
    () => ({ openUserProfile, closeUserProfile }),
    [openUserProfile, closeUserProfile]
  );

  return (
    <UserProfileModalContext.Provider value={contextValue}>
      {children}
      <UserProfileModal user={selectedUser} opened={!!selectedUser} onClose={closeUserProfile} />
    </UserProfileModalContext.Provider>
  );
});
