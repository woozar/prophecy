import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/lib/api-client/client';
import { showErrorToast, showSuccessToast } from '@/lib/toast/toast';

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
        list: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        resetPassword: vi.fn(),
      },
    },
  },
}));

const mockList = vi.mocked(apiClient.admin.users.list);
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
  createdAt: string;
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
      createdAt: '2025-01-15T10:00:00Z',
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
      createdAt: '2025-01-10T10:00:00Z',
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
      createdAt: '2025-01-05T10:00:00Z',
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
      createdAt: '2025-01-01T10:00:00Z',
      _count: { prophecies: 1, ratings: 2 },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setupMock(users = mockUsersData) {
    mockList.mockResolvedValue({
      data: { users },
      error: undefined,
      response: {} as Response,
    });
  }

  describe('initial loading', () => {
    it('shows loading state initially', () => {
      mockList.mockImplementation(() => new Promise(() => {})); // Never resolves
      renderWithMantine(<UsersManager />);
      expect(screen.getByText('Benutzer werden geladen...')).toBeInTheDocument();
    });

    it('fetches users on mount', async () => {
      setupMock();
      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(mockList).toHaveBeenCalled();
      });
    });

    it('shows error toast when fetch fails', async () => {
      mockList.mockResolvedValue({
        data: undefined,
        error: { error: 'Failed' },
        response: {} as Response,
      });

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('Fehler beim Laden der Benutzer');
      });
    });

    it('shows error toast when fetch throws', async () => {
      mockList.mockRejectedValue(new Error('Network error'));

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('Fehler beim Laden der Benutzer');
      });
    });
  });

  describe('PENDING users visibility (regression test)', () => {
    it('displays PENDING users from the API in the pending section', async () => {
      setupMock();
      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Pending User')).toBeInTheDocument();
      });

      expect(screen.getByText(/Ausstehende Freigaben \(1\)/)).toBeInTheDocument();
    });

    it('loads all user statuses including PENDING', async () => {
      const usersWithMultiplePending = [
        { ...mockUsersData[0], id: 'p1', username: 'pending1', displayName: 'Pending 1' },
        { ...mockUsersData[0], id: 'p2', username: 'pending2', displayName: 'Pending 2' },
        { ...mockUsersData[0], id: 'p3', username: 'pending3', displayName: 'Pending 3' },
        mockUsersData[1], // APPROVED
      ];

      setupMock(usersWithMultiplePending);
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
      setupMock();
      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText(/Ausstehende Freigaben/)).toBeInTheDocument();
      });
    });

    it('renders active users section', async () => {
      setupMock();
      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText(/Aktive Benutzer/)).toBeInTheDocument();
      });
    });

    it('renders other users section when there are non-approved users', async () => {
      setupMock();
      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText(/Sonstige/)).toBeInTheDocument();
      });
    });

    it('displays user display names', async () => {
      setupMock();
      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Pending User')).toBeInTheDocument();
      });
      expect(screen.getByText('Active User')).toBeInTheDocument();
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    it('shows admin badge for admin users', async () => {
      setupMock();
      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        const adminBadges = screen.getAllByText('Admin');
        expect(adminBadges.length).toBeGreaterThan(0);
      });
    });
  });

  describe('user actions', () => {
    it('approves pending user on click', async () => {
      const pendingUser = mockUsersData[0];
      setupMock([pendingUser]);

      mockUpdate.mockResolvedValue({
        data: { user: { ...pendingUser, status: 'APPROVED' } },
        error: undefined,
        response: {} as Response,
      });

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Pending User')).toBeInTheDocument();
      });

      const approveButton = screen.getByTitle('Freigeben');
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith('1', { status: 'APPROVED' });
      });
      expect(mockShowSuccessToast).toHaveBeenCalledWith('Benutzer freigegeben');
    });

    it('rejects pending user on click', async () => {
      const pendingUser = mockUsersData[0];
      setupMock([pendingUser]);

      // Note: REJECTED is a valid status in the API even though not in our MockUser type
      mockUpdate.mockResolvedValue({
        data: { user: { ...pendingUser, status: 'APPROVED' } as MockUser },
        error: undefined,
        response: {} as Response,
      });

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Pending User')).toBeInTheDocument();
      });

      const rejectButton = screen.getByTitle('Ablehnen');
      fireEvent.click(rejectButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith('1', { status: 'REJECTED' });
      });
    });

    it('promotes user to admin', async () => {
      const activeUser = mockUsersData[1];
      setupMock([activeUser]);

      mockUpdate.mockResolvedValue({
        data: { user: { ...activeUser, role: 'ADMIN' } },
        error: undefined,
        response: {} as Response,
      });

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Active User')).toBeInTheDocument();
      });

      const promoteButton = screen.getByTitle('Zum Admin machen');
      fireEvent.click(promoteButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith('2', { role: 'ADMIN' });
      });
      expect(mockShowSuccessToast).toHaveBeenCalledWith('Zum Admin befördert');
    });

    it('shows error toast when role change fails', async () => {
      const activeUser = mockUsersData[1];
      setupMock([activeUser]);

      mockUpdate.mockResolvedValue({
        data: undefined,
        error: { error: 'Cannot promote' },
        response: {} as Response,
      });

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Active User')).toBeInTheDocument();
      });

      const promoteButton = screen.getByTitle('Zum Admin machen');
      fireEvent.click(promoteButton);

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('Cannot promote');
      });
    });
  });

  describe('delete confirmation', () => {
    it('opens delete confirmation modal for pending users', async () => {
      const pendingUser = mockUsersData[0];
      setupMock([pendingUser]);

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Pending User')).toBeInTheDocument();
      });

      const deleteButton = screen.getByTitle('Löschen');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Benutzer löschen?')).toBeInTheDocument();
      });
      expect(screen.getByText(/"Pending User"/)).toBeInTheDocument();
    });

    it('deletes user when confirmed', async () => {
      const pendingUser = mockUsersData[0];
      setupMock([pendingUser]);

      mockDelete.mockResolvedValue({
        data: { success: true },
        error: undefined,
        response: {} as Response,
      });

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Pending User')).toBeInTheDocument();
      });

      const deleteButton = screen.getByTitle('Löschen');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Benutzer löschen?')).toBeInTheDocument();
      });

      const confirmButton = screen
        .getAllByRole('button')
        .find((btn) => btn.textContent?.includes('Löschen') && !btn.hasAttribute('title'));
      fireEvent.click(confirmButton!);

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalledWith('1');
      });
      expect(mockShowSuccessToast).toHaveBeenCalledWith('Benutzer gelöscht');
    });
  });

  describe('display', () => {
    it('falls back to username when displayName is null', async () => {
      const userWithoutDisplayName = { ...mockUsersData[0], displayName: null };
      setupMock([userWithoutDisplayName]);

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('pending_user')).toBeInTheDocument();
      });
    });

    it('hides pending users section when none exist', async () => {
      setupMock([mockUsersData[1]]); // Only APPROVED user

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Active User')).toBeInTheDocument();
      });
      expect(screen.queryByText(/Ausstehende Freigaben/)).not.toBeInTheDocument();
    });

    it('shows no active users message when none exist', async () => {
      setupMock([mockUsersData[0]]); // Only PENDING user

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Keine aktiven Benutzer vorhanden.')).toBeInTheDocument();
      });
    });
  });

  describe('suspend and reactivate', () => {
    it('suspends user when confirmed', async () => {
      const activeUser = mockUsersData[1];
      setupMock([activeUser]);

      mockUpdate.mockResolvedValue({
        data: { user: { ...activeUser, status: 'SUSPENDED' } },
        error: undefined,
        response: {} as Response,
      });

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Active User')).toBeInTheDocument();
      });

      const suspendButton = screen.getByTitle('Sperren');
      fireEvent.click(suspendButton);

      await waitFor(() => {
        expect(screen.getByText('Benutzer sperren?')).toBeInTheDocument();
      });

      const confirmButtons = screen.getAllByRole('button', { name: 'Sperren' });
      const confirmButton = confirmButtons.find((btn) => !btn.hasAttribute('title'));
      fireEvent.click(confirmButton!);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith('2', { status: 'SUSPENDED' });
      });
    });

    it('reactivates suspended user', async () => {
      const suspendedUser = mockUsersData[3];
      setupMock([suspendedUser]);

      mockUpdate.mockResolvedValue({
        data: { user: { ...suspendedUser, status: 'APPROVED' } },
        error: undefined,
        response: {} as Response,
      });

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Suspended User')).toBeInTheDocument();
      });

      const reactivateButton = screen.getByTitle('Reaktivieren');
      fireEvent.click(reactivateButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith('4', { status: 'APPROVED' });
      });
    });
  });

  describe('demote admin', () => {
    it('demotes admin when confirmed', async () => {
      const adminUser = mockUsersData[2];
      setupMock([adminUser]);

      mockUpdate.mockResolvedValue({
        data: { user: { ...adminUser, role: 'USER' } },
        error: undefined,
        response: {} as Response,
      });

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      const demoteButton = screen.getByTitle('Adminrechte entziehen');
      fireEvent.click(demoteButton);

      await waitFor(() => {
        expect(screen.getByText('Adminrechte entziehen?')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: 'Rechte entziehen' });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith('3', { role: 'USER' });
      });
      expect(mockShowSuccessToast).toHaveBeenCalledWith('Adminrechte entzogen');
    });
  });

  describe('password reset', () => {
    it('resets password and shows result modal', async () => {
      const activeUser = mockUsersData[1];
      setupMock([activeUser]);

      mockResetPassword.mockResolvedValue({
        data: { temporaryPassword: 'TempPass123' },
        error: undefined,
        response: {} as Response,
      });

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Active User')).toBeInTheDocument();
      });

      const resetButton = screen.getByTitle('Passwort zurücksetzen');
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith('2');
      });

      await waitFor(() => {
        expect(screen.getByText('Passwort zurückgesetzt')).toBeInTheDocument();
      });
      expect(screen.getByText('TempPass123')).toBeInTheDocument();
      expect(mockShowSuccessToast).toHaveBeenCalledWith('Passwort wurde zurückgesetzt');
    });
  });

  describe('error handling', () => {
    it('handles unknown errors gracefully', async () => {
      const activeUser = mockUsersData[1];
      setupMock([activeUser]);

      mockUpdate.mockRejectedValue('Network error');

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Active User')).toBeInTheDocument();
      });

      const promoteButton = screen.getByTitle('Zum Admin machen');
      fireEvent.click(promoteButton);

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('Unbekannter Fehler');
      });
    });
  });
});
