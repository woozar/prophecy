import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

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

// Mock the store
const mockSetUser = vi.fn();
const mockRemoveUser = vi.fn();
let mockUsersRecord: Record<
  string,
  {
    id: string;
    username: string;
    displayName: string | null;
    status: string;
    role: string;
    createdAt: string;
    _count?: { prophecies: number; ratings: number };
  }
> = {};

vi.mock('@/store/useUserStore', () => ({
  useUserStore: Object.assign(
    (selector?: (state: { users: typeof mockUsersRecord }) => unknown) => {
      const state = {
        users: mockUsersRecord,
        setUser: mockSetUser,
        removeUser: mockRemoveUser,
      };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({
        users: mockUsersRecord,
        setUser: mockSetUser,
        removeUser: mockRemoveUser,
      }),
    }
  ),
}));

// Mock toast
vi.mock('@/lib/toast/toast', () => ({
  showSuccessToast: vi.fn(),
  showErrorToast: vi.fn(),
}));

const mockShowSuccessToast = vi.mocked(showSuccessToast);
const mockShowErrorToast = vi.mocked(showErrorToast);

describe('UsersManager', () => {
  const mockUsersData: Record<
    string,
    {
      id: string;
      username: string;
      displayName: string | null;
      status: string;
      role: string;
      createdAt: string;
      _count: { prophecies: number; ratings: number };
    }
  > = {
    '1': {
      id: '1',
      username: 'pending_user',
      displayName: 'Pending User',
      status: 'PENDING',
      role: 'USER',
      createdAt: '2025-01-15T10:00:00Z',
      _count: { prophecies: 0, ratings: 0 },
    },
    '2': {
      id: '2',
      username: 'active_user',
      displayName: 'Active User',
      status: 'APPROVED',
      role: 'USER',
      createdAt: '2025-01-10T10:00:00Z',
      _count: { prophecies: 5, ratings: 10 },
    },
    '3': {
      id: '3',
      username: 'admin_user',
      displayName: 'Admin User',
      status: 'APPROVED',
      role: 'ADMIN',
      createdAt: '2025-01-05T10:00:00Z',
      _count: { prophecies: 3, ratings: 7 },
    },
    '4': {
      id: '4',
      username: 'suspended_user',
      displayName: 'Suspended User',
      status: 'SUSPENDED',
      role: 'USER',
      createdAt: '2025-01-01T10:00:00Z',
      _count: { prophecies: 1, ratings: 2 },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsersRecord = { ...mockUsersData };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders pending users section when pending users exist', () => {
      renderWithMantine(<UsersManager />);
      expect(screen.getByText(/Ausstehende Freigaben/)).toBeInTheDocument();
    });

    it('renders active users section', () => {
      renderWithMantine(<UsersManager />);
      expect(screen.getByText(/Aktive Benutzer/)).toBeInTheDocument();
    });

    it('renders other users section when there are non-approved users', () => {
      renderWithMantine(<UsersManager />);
      expect(screen.getByText(/Sonstige/)).toBeInTheDocument();
    });

    it('displays user display names', () => {
      renderWithMantine(<UsersManager />);
      expect(screen.getByText('Pending User')).toBeInTheDocument();
      expect(screen.getByText('Active User')).toBeInTheDocument();
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    it('shows admin badge for admin users', () => {
      renderWithMantine(<UsersManager />);
      const adminBadges = screen.getAllByText('Admin');
      expect(adminBadges.length).toBeGreaterThan(0);
    });
  });

  describe('user actions', () => {
    it('approves pending user on click', async () => {
      mockUsersRecord = { '1': mockUsersData['1'] };
      const updatedUser = { ...mockUsersData['1'], status: 'APPROVED' };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: updatedUser }),
      });
      globalThis.fetch = mockFetch;

      renderWithMantine(<UsersManager />);

      const approveButton = screen.getByTitle('Freigeben');
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/users/1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'APPROVED' }),
        });
      });
      expect(mockSetUser).toHaveBeenCalledWith(updatedUser);
      expect(mockShowSuccessToast).toHaveBeenCalledWith('Benutzer freigegeben');
    });

    it('rejects pending user on click', async () => {
      mockUsersRecord = { '1': mockUsersData['1'] };
      const updatedUser = { ...mockUsersData['1'], status: 'REJECTED' };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: updatedUser }),
      });
      globalThis.fetch = mockFetch;

      renderWithMantine(<UsersManager />);

      const rejectButton = screen.getByTitle('Ablehnen');
      fireEvent.click(rejectButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/users/1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'REJECTED' }),
        });
      });
      expect(mockSetUser).toHaveBeenCalledWith(updatedUser);
    });

    it('promotes user to admin', async () => {
      mockUsersRecord = { '2': mockUsersData['2'] };
      const updatedUser = { ...mockUsersData['2'], role: 'ADMIN' };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: updatedUser }),
      });
      globalThis.fetch = mockFetch;

      renderWithMantine(<UsersManager />);

      const promoteButton = screen.getByTitle('Zum Admin machen');
      fireEvent.click(promoteButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/users/2', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'ADMIN' }),
        });
      });
      expect(mockSetUser).toHaveBeenCalledWith(updatedUser);
      expect(mockShowSuccessToast).toHaveBeenCalledWith('Zum Admin befördert');
    });

    it('shows error toast when role change fails', async () => {
      mockUsersRecord = { '2': mockUsersData['2'] };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Cannot promote' }),
      });
      globalThis.fetch = mockFetch;

      renderWithMantine(<UsersManager />);

      const promoteButton = screen.getByTitle('Zum Admin machen');
      fireEvent.click(promoteButton);

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('Cannot promote');
      });
    });
  });

  describe('delete confirmation', () => {
    it('opens delete confirmation modal for pending users', async () => {
      mockUsersRecord = { '1': mockUsersData['1'] };
      renderWithMantine(<UsersManager />);

      const deleteButton = screen.getByTitle('Löschen');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Benutzer löschen?')).toBeInTheDocument();
      });
      expect(screen.getByText(/"Pending User"/)).toBeInTheDocument();
    });

    it('deletes user when confirmed', async () => {
      mockUsersRecord = { '1': mockUsersData['1'] };
      const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
      globalThis.fetch = mockFetch;

      renderWithMantine(<UsersManager />);

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
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/users/1', { method: 'DELETE' });
      });
      expect(mockRemoveUser).toHaveBeenCalledWith('1');
      expect(mockShowSuccessToast).toHaveBeenCalledWith('Benutzer gelöscht');
    });

    it('shows error toast when delete fails', async () => {
      mockUsersRecord = { '1': mockUsersData['1'] };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Cannot delete' }),
      });
      globalThis.fetch = mockFetch;

      renderWithMantine(<UsersManager />);

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
        expect(mockShowErrorToast).toHaveBeenCalledWith('Cannot delete');
      });
    });

    it('opens delete confirmation modal for active users', async () => {
      mockUsersRecord = { '2': mockUsersData['2'] };
      renderWithMantine(<UsersManager />);

      const deleteButton = screen.getByTitle('Löschen');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Benutzer löschen?')).toBeInTheDocument();
      });
      expect(screen.getByText(/"Active User"/)).toBeInTheDocument();
    });

    it('opens delete confirmation modal for suspended users', async () => {
      mockUsersRecord = { '4': mockUsersData['4'] };
      renderWithMantine(<UsersManager />);

      const deleteButton = screen.getByTitle('Löschen');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Benutzer löschen?')).toBeInTheDocument();
      });
      expect(screen.getByText(/"Suspended User"/)).toBeInTheDocument();
    });
  });

  describe('display', () => {
    it('falls back to username when displayName is null', () => {
      mockUsersRecord = {
        '1': { ...mockUsersData['1'], displayName: null },
      };
      renderWithMantine(<UsersManager />);
      expect(screen.getByText('pending_user')).toBeInTheDocument();
    });

    it('hides pending users section when none exist', () => {
      mockUsersRecord = { '2': mockUsersData['2'] };
      renderWithMantine(<UsersManager />);
      expect(screen.queryByText(/Ausstehende Freigaben/)).not.toBeInTheDocument();
    });

    it('shows no active users message when none exist', () => {
      mockUsersRecord = { '1': mockUsersData['1'] };
      renderWithMantine(<UsersManager />);
      expect(screen.getByText('Keine aktiven Benutzer vorhanden.')).toBeInTheDocument();
    });
  });

  describe('suspend and reactivate', () => {
    it('opens suspend confirmation modal for active users', async () => {
      mockUsersRecord = { '2': mockUsersData['2'] };
      renderWithMantine(<UsersManager />);

      const suspendButton = screen.getByTitle('Sperren');
      fireEvent.click(suspendButton);

      await waitFor(() => {
        expect(screen.getByText('Benutzer sperren?')).toBeInTheDocument();
      });
      expect(screen.getByText(/"Active User"/)).toBeInTheDocument();
    });

    it('suspends user when confirmed', async () => {
      mockUsersRecord = { '2': mockUsersData['2'] };
      const updatedUser = { ...mockUsersData['2'], status: 'SUSPENDED' };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: updatedUser }),
      });
      globalThis.fetch = mockFetch;

      renderWithMantine(<UsersManager />);

      const suspendButton = screen.getByTitle('Sperren');
      fireEvent.click(suspendButton);

      await waitFor(() => {
        expect(screen.getByText('Benutzer sperren?')).toBeInTheDocument();
      });

      // Find the confirm button in the modal (not the icon button with title)
      const confirmButtons = screen.getAllByRole('button', { name: 'Sperren' });
      const confirmButton = confirmButtons.find((btn) => !btn.hasAttribute('title'));
      fireEvent.click(confirmButton!);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/users/2', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'SUSPENDED' }),
        });
      });
      expect(mockSetUser).toHaveBeenCalledWith(updatedUser);
    });

    it('reactivates suspended user', async () => {
      mockUsersRecord = { '4': mockUsersData['4'] };
      const updatedUser = { ...mockUsersData['4'], status: 'APPROVED' };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: updatedUser }),
      });
      globalThis.fetch = mockFetch;

      renderWithMantine(<UsersManager />);

      const reactivateButton = screen.getByTitle('Reaktivieren');
      fireEvent.click(reactivateButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/users/4', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'APPROVED' }),
        });
      });
      expect(mockSetUser).toHaveBeenCalledWith(updatedUser);
    });
  });

  describe('demote admin', () => {
    it('opens demote confirmation modal for admin users', async () => {
      mockUsersRecord = { '3': mockUsersData['3'] };
      renderWithMantine(<UsersManager />);

      const demoteButton = screen.getByTitle('Adminrechte entziehen');
      fireEvent.click(demoteButton);

      await waitFor(() => {
        expect(screen.getByText('Adminrechte entziehen?')).toBeInTheDocument();
      });
      expect(screen.getByText(/"Admin User"/)).toBeInTheDocument();
    });

    it('demotes admin when confirmed', async () => {
      mockUsersRecord = { '3': mockUsersData['3'] };
      const updatedUser = { ...mockUsersData['3'], role: 'USER' };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: updatedUser }),
      });
      globalThis.fetch = mockFetch;

      renderWithMantine(<UsersManager />);

      const demoteButton = screen.getByTitle('Adminrechte entziehen');
      fireEvent.click(demoteButton);

      await waitFor(() => {
        expect(screen.getByText('Adminrechte entziehen?')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: 'Rechte entziehen' });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/users/3', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'USER' }),
        });
      });
      expect(mockSetUser).toHaveBeenCalledWith(updatedUser);
      expect(mockShowSuccessToast).toHaveBeenCalledWith('Adminrechte entzogen');
    });
  });

  describe('password reset', () => {
    it('resets password and shows result modal', async () => {
      mockUsersRecord = { '2': mockUsersData['2'] };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ newPassword: 'TempPass123' }),
      });
      globalThis.fetch = mockFetch;

      renderWithMantine(<UsersManager />);

      const resetButton = screen.getByTitle('Passwort zurücksetzen');
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/users/2/reset-password', {
          method: 'POST',
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Passwort zurückgesetzt')).toBeInTheDocument();
      });
      expect(screen.getByText('TempPass123')).toBeInTheDocument();
      // Check that the modal shows the username - use the text within the modal
      expect(screen.getByText(/wurde zurückgesetzt/)).toBeInTheDocument();
      expect(mockShowSuccessToast).toHaveBeenCalledWith('Passwort wurde zurückgesetzt');
    });

    it('shows error when password reset fails', async () => {
      mockUsersRecord = { '2': mockUsersData['2'] };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Cannot reset' }),
      });
      globalThis.fetch = mockFetch;

      renderWithMantine(<UsersManager />);

      const resetButton = screen.getByTitle('Passwort zurücksetzen');
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('Cannot reset');
      });
    });

    it('closes password result modal when clicking close button', async () => {
      mockUsersRecord = { '2': mockUsersData['2'] };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ newPassword: 'TempPass123' }),
      });
      globalThis.fetch = mockFetch;

      renderWithMantine(<UsersManager />);

      const resetButton = screen.getByTitle('Passwort zurücksetzen');
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(screen.getByText('Passwort zurückgesetzt')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: 'Schließen' });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Passwort zurückgesetzt')).not.toBeInTheDocument();
      });
    });
  });

  describe('modal interactions', () => {
    it('closes delete confirmation modal when clicking cancel', async () => {
      mockUsersRecord = { '1': mockUsersData['1'] };
      renderWithMantine(<UsersManager />);

      const deleteButton = screen.getByTitle('Löschen');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Benutzer löschen?')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: 'Abbrechen' });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Benutzer löschen?')).not.toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('shows error toast when status change fails', async () => {
      mockUsersRecord = { '1': mockUsersData['1'] };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Status change failed' }),
      });
      globalThis.fetch = mockFetch;

      renderWithMantine(<UsersManager />);

      const approveButton = screen.getByTitle('Freigeben');
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('Status change failed');
      });
    });

    it('handles unknown errors gracefully', async () => {
      mockUsersRecord = { '2': mockUsersData['2'] };
      const mockFetch = vi.fn().mockRejectedValue('Network error');
      globalThis.fetch = mockFetch;

      renderWithMantine(<UsersManager />);

      const promoteButton = screen.getByTitle('Zum Admin machen');
      fireEvent.click(promoteButton);

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('Unbekannter Fehler');
      });
    });
  });
});
