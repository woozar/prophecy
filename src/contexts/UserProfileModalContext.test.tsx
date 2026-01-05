import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { User } from '@/store/useUserStore';

import { UserProfileModalProvider, useUserProfileModal } from './UserProfileModalContext';

// Mock UserProfileModal
vi.mock('@/components/UserProfileModal', () => ({
  UserProfileModal: ({
    user,
    opened,
    onClose,
  }: {
    user: User | null;
    opened: boolean;
    onClose: () => void;
  }) =>
    opened ? (
      <div data-testid="user-profile-modal">
        <span data-testid="modal-username">{user?.username}</span>
        <button data-testid="close-modal" onClick={onClose}>
          Close
        </button>
      </div>
    ) : null,
}));

// Mock matchMedia for Mantine
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

const mockUser: User = {
  id: 'user-1',
  username: 'testuser',
  displayName: 'Test User',
  avatarUrl: null,
  avatarEffect: null,
  avatarEffectColors: [],
  role: 'USER',
  status: 'APPROVED',
};

function TestConsumer() {
  const { openUserProfile, closeUserProfile } = useUserProfileModal();

  return (
    <div>
      <button data-testid="open-profile" onClick={() => openUserProfile(mockUser)}>
        Open Profile
      </button>
      <button data-testid="close-profile" onClick={closeUserProfile}>
        Close Profile
      </button>
    </div>
  );
}

function renderWithProviders(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe('UserProfileModalContext', () => {
  describe('useUserProfileModal', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderWithProviders(<TestConsumer />);
      }).toThrow('useUserProfileModal must be used within a UserProfileModalProvider');

      consoleSpy.mockRestore();
    });

    it('returns context value when used within provider', () => {
      renderWithProviders(
        <UserProfileModalProvider>
          <TestConsumer />
        </UserProfileModalProvider>
      );

      expect(screen.getByTestId('open-profile')).toBeInTheDocument();
      expect(screen.getByTestId('close-profile')).toBeInTheDocument();
    });
  });

  describe('UserProfileModalProvider', () => {
    it('renders children', () => {
      renderWithProviders(
        <UserProfileModalProvider>
          <div data-testid="child-content">Child Content</div>
        </UserProfileModalProvider>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('opens modal when openUserProfile is called', async () => {
      renderWithProviders(
        <UserProfileModalProvider>
          <TestConsumer />
        </UserProfileModalProvider>
      );

      // Modal should not be visible initially
      expect(screen.queryByTestId('user-profile-modal')).not.toBeInTheDocument();

      // Click to open profile
      fireEvent.click(screen.getByTestId('open-profile'));

      // Modal should now be visible with user data
      await waitFor(() => {
        expect(screen.getByTestId('user-profile-modal')).toBeInTheDocument();
      });
      expect(screen.getByTestId('modal-username')).toHaveTextContent('testuser');
    });

    it('closes modal when closeUserProfile is called', async () => {
      renderWithProviders(
        <UserProfileModalProvider>
          <TestConsumer />
        </UserProfileModalProvider>
      );

      // Open the modal first
      fireEvent.click(screen.getByTestId('open-profile'));
      await waitFor(() => {
        expect(screen.getByTestId('user-profile-modal')).toBeInTheDocument();
      });

      // Close the modal
      fireEvent.click(screen.getByTestId('close-profile'));

      // Modal should be closed
      await waitFor(() => {
        expect(screen.queryByTestId('user-profile-modal')).not.toBeInTheDocument();
      });
    });

    it('closes modal when onClose callback is triggered', async () => {
      renderWithProviders(
        <UserProfileModalProvider>
          <TestConsumer />
        </UserProfileModalProvider>
      );

      // Open the modal first
      fireEvent.click(screen.getByTestId('open-profile'));
      await waitFor(() => {
        expect(screen.getByTestId('user-profile-modal')).toBeInTheDocument();
      });

      // Close using the modal's close button
      fireEvent.click(screen.getByTestId('close-modal'));

      // Modal should be closed
      await waitFor(() => {
        expect(screen.queryByTestId('user-profile-modal')).not.toBeInTheDocument();
      });
    });
  });
});
