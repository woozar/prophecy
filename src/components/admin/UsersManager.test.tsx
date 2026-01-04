import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/lib/api-client/client';
import { showErrorToast, showSuccessToast } from '@/lib/toast/toast';
import { useBadgeStore } from '@/store/useBadgeStore';
import { useUserStore } from '@/store/useUserStore';

import { UsersManager } from './UsersManager';

function renderWithMantine(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

// Mock matchMedia for useReducedMotion hook
beforeAll(() => {
  Object.defineProperty(globalThis, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
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

// Mock toast
vi.mock('@/lib/toast/toast', () => ({
  showSuccessToast: vi.fn(),
  showErrorToast: vi.fn(),
}));

// Mock apiClient
vi.mock('@/lib/api-client/client', () => ({
  apiClient: {
    admin: {
      users: {
        update: vi.fn(),
        delete: vi.fn(),
        resetPassword: vi.fn(),
      },
    },
  },
}));

const mockUpdate = vi.mocked(apiClient.admin.users.update);
const mockDelete = vi.mocked(apiClient.admin.users.delete);
const mockResetPassword = vi.mocked(apiClient.admin.users.resetPassword);

const mockShowSuccessToast = vi.mocked(showSuccessToast);
const mockShowErrorToast = vi.mocked(showErrorToast);

interface MockUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  avatarEffect: string | null;
  avatarEffectColors: string[];
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED';
  role: 'USER' | 'ADMIN';
  isBot: boolean;
  createdAt: string;
  badgeIds?: string[];
  _count: { prophecies: number; ratings: number };
}

describe('UsersManager', () => {
  const mockUsersData: MockUser[] = [
    {
      id: '1',
      username: 'pending_user',
      displayName: 'Pending User',
      avatarUrl: null,
      avatarEffect: null,
      avatarEffectColors: [],
      status: 'PENDING',
      role: 'USER',
      isBot: false,
      createdAt: '2025-01-15T10:00:00Z',
      badgeIds: [],
      _count: { prophecies: 0, ratings: 0 },
    },
    {
      id: '2',
      username: 'active_user',
      displayName: 'Active User',
      avatarUrl: null,
      avatarEffect: null,
      avatarEffectColors: [],
      status: 'APPROVED',
      role: 'USER',
      isBot: false,
      createdAt: '2025-01-10T10:00:00Z',
      badgeIds: [],
      _count: { prophecies: 5, ratings: 10 },
    },
    {
      id: '3',
      username: 'admin_user',
      displayName: 'Admin User',
      avatarUrl: null,
      avatarEffect: null,
      avatarEffectColors: [],
      status: 'APPROVED',
      role: 'ADMIN',
      isBot: false,
      createdAt: '2025-01-05T10:00:00Z',
      badgeIds: [],
      _count: { prophecies: 3, ratings: 7 },
    },
    {
      id: '4',
      username: 'suspended_user',
      displayName: 'Suspended User',
      avatarUrl: null,
      avatarEffect: null,
      avatarEffectColors: [],
      status: 'SUSPENDED',
      role: 'USER',
      isBot: false,
      createdAt: '2025-01-01T10:00:00Z',
      badgeIds: [],
      _count: { prophecies: 1, ratings: 2 },
    },
  ];

  // Helper to set up user store with data
  function setupStore(users = mockUsersData, currentUserId = '3') {
    const usersRecord = users.reduce(
      (acc, user) => {
        acc[user.id] = user;
        return acc;
      },
      {} as Record<string, MockUser>
    );

    useUserStore.setState({
      users: usersRecord,
      currentUserId,
      isInitialized: true,
    });

    useBadgeStore.setState({
      badges: {},
      allUserBadges: {},
      isInitialized: true,
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset stores
    useUserStore.setState({
      users: {},
      currentUserId: null,
      isInitialized: false,
    });
    useBadgeStore.setState({
      badges: {},
      allUserBadges: {},
      isInitialized: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial loading', () => {
    it('shows loading state when store not initialized', () => {
      // Store not initialized = loading
      renderWithMantine(<UsersManager />);
      expect(screen.getByText('Benutzer werden geladen...')).toBeInTheDocument();
    });

    it('shows users when store is initialized', async () => {
      setupStore();
      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Active User')).toBeInTheDocument();
      });
    });
  });

  describe('PENDING users visibility', () => {
    it('displays PENDING users in the pending section', async () => {
      setupStore();
      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Pending User')).toBeInTheDocument();
      });

      expect(screen.getByText(/Ausstehende Freigaben \(1\)/)).toBeInTheDocument();
    });

    it('shows multiple pending users', async () => {
      const usersWithMultiplePending = [
        { ...mockUsersData[0], id: 'p1', username: 'pending1', displayName: 'Pending 1' },
        { ...mockUsersData[0], id: 'p2', username: 'pending2', displayName: 'Pending 2' },
        { ...mockUsersData[0], id: 'p3', username: 'pending3', displayName: 'Pending 3' },
        mockUsersData[2], // Admin (current user)
      ];

      setupStore(usersWithMultiplePending);
      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Pending 1')).toBeInTheDocument();
      });
      expect(screen.getByText('Pending 2')).toBeInTheDocument();
      expect(screen.getByText('Pending 3')).toBeInTheDocument();
      expect(screen.getByText(/Ausstehende Freigaben \(3\)/)).toBeInTheDocument();
    });
  });

  describe('rendering', () => {
    it('renders pending users section when pending users exist', async () => {
      setupStore();
      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText(/Ausstehende Freigaben/)).toBeInTheDocument();
      });
    });

    it('renders active users section', async () => {
      setupStore();
      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText(/Aktive Benutzer/)).toBeInTheDocument();
      });
    });

    it('renders other users section when there are non-approved users', async () => {
      setupStore();
      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText(/Sonstige/)).toBeInTheDocument();
      });
    });

    it('displays user display names', async () => {
      setupStore();
      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Pending User')).toBeInTheDocument();
      });
      expect(screen.getByText('Active User')).toBeInTheDocument();
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    it('shows admin badge for admin users', async () => {
      setupStore();
      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });
      // Admin badge should appear
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });
  });

  describe('user actions', () => {
    it('approves pending user on click', async () => {
      setupStore();
      mockUpdate.mockResolvedValue({
        data: { user: { ...mockUsersData[0], status: 'APPROVED' } },
        error: undefined,
        response: {} as Response,
      });

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Pending User')).toBeInTheDocument();
      });

      const approveButtons = screen.getAllByTitle('Freigeben');
      fireEvent.click(approveButtons[0]);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith('1', { status: 'APPROVED' });
      });

      expect(mockShowSuccessToast).toHaveBeenCalledWith('Benutzer freigegeben');
    });

    it('rejects pending user on click', async () => {
      setupStore();
      mockUpdate.mockResolvedValue({
        data: { user: { ...mockUsersData[0], status: 'REJECTED' as const } },
        error: undefined,
        response: {} as Response,
      });

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Pending User')).toBeInTheDocument();
      });

      const rejectButtons = screen.getAllByTitle('Ablehnen');
      fireEvent.click(rejectButtons[0]);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith('1', { status: 'REJECTED' });
      });
    });

    it('promotes user to admin', async () => {
      setupStore();
      mockUpdate.mockResolvedValue({
        data: { user: { ...mockUsersData[1], role: 'ADMIN' } },
        error: undefined,
        response: {} as Response,
      });

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Active User')).toBeInTheDocument();
      });

      const promoteButtons = screen.getAllByTitle('Zum Admin machen');
      fireEvent.click(promoteButtons[0]);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith('2', { role: 'ADMIN' });
      });

      expect(mockShowSuccessToast).toHaveBeenCalledWith('Zum Admin befördert');
    });

    it('shows error toast when role change fails', async () => {
      setupStore();
      mockUpdate.mockResolvedValue({
        data: undefined,
        error: { error: 'Cannot promote' },
        response: {} as Response,
      });

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Active User')).toBeInTheDocument();
      });

      const promoteButtons = screen.getAllByTitle('Zum Admin machen');
      fireEvent.click(promoteButtons[0]);

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('Cannot promote');
      });
    });
  });

  describe('delete confirmation', () => {
    it('opens delete confirmation modal for pending users', async () => {
      setupStore();
      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Pending User')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('Löschen');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Benutzer löschen/)).toBeInTheDocument();
      });
      expect(screen.getByText(/Möchtest du "Pending User" wirklich löschen/)).toBeInTheDocument();
    });

    it('deletes user when confirmed', async () => {
      // Only include pending user and admin
      const usersForDelete = [
        mockUsersData[0], // Pending User (id 1)
        mockUsersData[2], // Admin User (id 3, current user)
      ];
      setupStore(usersForDelete);
      mockDelete.mockResolvedValue({
        data: { success: true },
        error: undefined,
        response: {} as Response,
      });

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Pending User')).toBeInTheDocument();
      });

      // Find delete button for Pending User specifically
      const pendingUserText = screen.getByText('Pending User');
      const pendingUserCard = pendingUserText.closest('.card-dark') as HTMLElement;
      const deleteButton = within(pendingUserCard).getByTitle('Löschen');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Benutzer löschen?')).toBeInTheDocument();
      });

      // Click the confirm button in the modal - find by button text content
      const buttons = screen.getAllByRole('button');
      const confirmButton = buttons.find(
        (btn) => btn.textContent === 'Löschen' && !btn.querySelector('svg')
      );
      if (confirmButton) fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalledWith('1');
      });

      await waitFor(() => {
        expect(mockShowSuccessToast).toHaveBeenCalledWith('Benutzer gelöscht');
      });
    });
  });

  describe('display', () => {
    it('falls back to username when displayName is null', async () => {
      const usersWithNullDisplayName = [
        { ...mockUsersData[0], displayName: null },
        mockUsersData[2], // Admin
      ];
      setupStore(usersWithNullDisplayName);
      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('pending_user')).toBeInTheDocument();
      });
    });

    it('hides pending users section when none exist', async () => {
      const usersWithoutPending = mockUsersData.filter((u) => u.status !== 'PENDING');
      setupStore(usersWithoutPending);
      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Active User')).toBeInTheDocument();
      });

      expect(screen.queryByText(/Ausstehende Freigaben/)).not.toBeInTheDocument();
    });

    it('shows no active users message when none exist', async () => {
      // Admin must have SUSPENDED status to not appear in active users
      // But we still need a working admin for the page to render
      const adminWithSuspended = {
        ...mockUsersData[2],
        status: 'SUSPENDED' as const,
      };
      const usersWithoutActive = [mockUsersData[0], adminWithSuspended]; // Only pending and suspended
      setupStore(usersWithoutActive);
      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Keine aktiven Benutzer vorhanden.')).toBeInTheDocument();
      });
    });
  });

  describe('suspend and reactivate', () => {
    it('suspends user when confirmed', async () => {
      // Only include Active User and Admin to simplify
      const usersWithOneActive = [
        mockUsersData[1], // Active User (id 2)
        mockUsersData[2], // Admin User (id 3, current user)
      ];
      setupStore(usersWithOneActive);
      mockUpdate.mockResolvedValue({
        data: { user: { ...mockUsersData[1], status: 'SUSPENDED' } },
        error: undefined,
        response: {} as Response,
      });

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Active User')).toBeInTheDocument();
      });

      // Find the suspend button for Active User specifically
      const activeUserText = screen.getByText('Active User');
      const activeUserCard = activeUserText.closest('.card-dark') as HTMLElement;
      const suspendButton = within(activeUserCard).getByTitle('Sperren');
      fireEvent.click(suspendButton);

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByText('Benutzer sperren?')).toBeInTheDocument();
      });

      // Click the confirm button in the modal - find by button text content
      const buttons = screen.getAllByRole('button');
      const confirmButton = buttons.find(
        (btn) => btn.textContent === 'Sperren' && !btn.querySelector('svg')
      );
      if (confirmButton) fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith('2', { status: 'SUSPENDED' });
      });

      await waitFor(() => {
        expect(mockShowSuccessToast).toHaveBeenCalledWith('Benutzer gesperrt');
      });
    });

    it('reactivates suspended user', async () => {
      setupStore();
      mockUpdate.mockResolvedValue({
        data: { user: { ...mockUsersData[3], status: 'APPROVED' } },
        error: undefined,
        response: {} as Response,
      });

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Suspended User')).toBeInTheDocument();
      });

      const reactivateButtons = screen.getAllByTitle('Reaktivieren');
      fireEvent.click(reactivateButtons[0]);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith('4', { status: 'APPROVED' });
      });
    });
  });

  describe('demote admin', () => {
    it('demotes admin when confirmed', async () => {
      // Need a second admin so we can demote admin_user
      const usersWithTwoAdmins = [
        ...mockUsersData,
        {
          ...mockUsersData[2],
          id: '5',
          username: 'second_admin',
          displayName: 'Second Admin',
        },
      ];
      setupStore(usersWithTwoAdmins, '5'); // Current user is second admin

      mockUpdate.mockResolvedValue({
        data: { user: { ...mockUsersData[2], role: 'USER' } },
        error: undefined,
        response: {} as Response,
      });

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      const demoteButtons = screen.getAllByTitle('Adminrechte entziehen');
      fireEvent.click(demoteButtons[0]);

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Rechte entziehen' })).toBeInTheDocument();
      });

      // Confirm in modal
      const confirmButton = screen.getByRole('button', { name: 'Rechte entziehen' });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith('3', { role: 'USER' });
      });

      await waitFor(() => {
        expect(mockShowSuccessToast).toHaveBeenCalledWith('Adminrechte entzogen');
      });
    });
  });

  describe('password reset', () => {
    it('resets password and shows result modal', async () => {
      setupStore();
      mockResetPassword.mockResolvedValue({
        data: { temporaryPassword: 'temp123' },
        error: undefined,
        response: {} as Response,
      });

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Active User')).toBeInTheDocument();
      });

      const resetButtons = screen.getAllByTitle('Passwort zurücksetzen');
      fireEvent.click(resetButtons[0]);

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith('2');
      });

      await waitFor(() => {
        expect(screen.getByText('Passwort zurückgesetzt')).toBeInTheDocument();
      });
      expect(screen.getByText('temp123')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('handles unknown errors gracefully', async () => {
      setupStore();
      mockUpdate.mockRejectedValue(new Error('Unknown error'));

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Active User')).toBeInTheDocument();
      });

      const promoteButtons = screen.getAllByTitle('Zum Admin machen');
      fireEvent.click(promoteButtons[0]);

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('Unknown error');
      });
    });
  });
});
