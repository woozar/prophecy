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

// Mock toast
vi.mock('@/lib/toast/toast', () => ({
  showSuccessToast: vi.fn(),
  showErrorToast: vi.fn(),
}));

const mockShowSuccessToast = vi.mocked(showSuccessToast);
const mockShowErrorToast = vi.mocked(showErrorToast);

describe('UsersManager', () => {
  const mockUsersData = [
    {
      id: '1',
      username: 'pending_user',
      displayName: 'Pending User',
      status: 'PENDING',
      role: 'USER',
      createdAt: '2025-01-15T10:00:00Z',
      _count: { prophecies: 0, ratings: 0 },
    },
    {
      id: '2',
      username: 'active_user',
      displayName: 'Active User',
      status: 'APPROVED',
      role: 'USER',
      createdAt: '2025-01-10T10:00:00Z',
      _count: { prophecies: 5, ratings: 10 },
    },
    {
      id: '3',
      username: 'admin_user',
      displayName: 'Admin User',
      status: 'APPROVED',
      role: 'ADMIN',
      createdAt: '2025-01-05T10:00:00Z',
      _count: { prophecies: 3, ratings: 7 },
    },
    {
      id: '4',
      username: 'suspended_user',
      displayName: 'Suspended User',
      status: 'SUSPENDED',
      role: 'USER',
      createdAt: '2025-01-01T10:00:00Z',
      _count: { prophecies: 1, ratings: 2 },
    },
  ];

  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setupFetchMock(users = mockUsersData) {
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (url === '/api/admin/users' && !options?.method) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ users }),
        });
      }
      // Default fallback for other requests
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  }

  describe('initial loading', () => {
    it('shows loading state initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
      renderWithMantine(<UsersManager />);
      expect(screen.getByText('Benutzer werden geladen...')).toBeInTheDocument();
    });

    it('fetches users from /api/admin/users on mount', async () => {
      setupFetchMock();
      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/users');
      });
    });

    it('shows error toast when fetch fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed' }),
      });

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('Fehler beim Laden der Benutzer');
      });
    });

    it('shows error toast when fetch throws', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('Fehler beim Laden der Benutzer');
      });
    });
  });

  describe('PENDING users visibility (regression test)', () => {
    it('displays PENDING users from the API in the pending section', async () => {
      setupFetchMock();
      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Pending User')).toBeInTheDocument();
      });

      expect(screen.getByText(/Ausstehende Freigaben \(1\)/)).toBeInTheDocument();
    });

    it('loads all user statuses including PENDING from /api/admin/users', async () => {
      const usersWithMultiplePending = [
        { ...mockUsersData[0], id: 'p1', username: 'pending1', displayName: 'Pending 1' },
        { ...mockUsersData[0], id: 'p2', username: 'pending2', displayName: 'Pending 2' },
        { ...mockUsersData[0], id: 'p3', username: 'pending3', displayName: 'Pending 3' },
        mockUsersData[1], // APPROVED
      ];

      setupFetchMock(usersWithMultiplePending);
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
      setupFetchMock();
      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText(/Ausstehende Freigaben/)).toBeInTheDocument();
      });
    });

    it('renders active users section', async () => {
      setupFetchMock();
      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText(/Aktive Benutzer/)).toBeInTheDocument();
      });
    });

    it('renders other users section when there are non-approved users', async () => {
      setupFetchMock();
      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText(/Sonstige/)).toBeInTheDocument();
      });
    });

    it('displays user display names', async () => {
      setupFetchMock();
      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Pending User')).toBeInTheDocument();
      });
      expect(screen.getByText('Active User')).toBeInTheDocument();
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    it('shows admin badge for admin users', async () => {
      setupFetchMock();
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
      setupFetchMock([pendingUser]);

      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (url === '/api/admin/users' && !options?.method) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ users: [pendingUser] }),
          });
        }
        if (url === `/api/admin/users/${pendingUser.id}` && options?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ user: { ...pendingUser, status: 'APPROVED' } }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Pending User')).toBeInTheDocument();
      });

      const approveButton = screen.getByTitle('Freigeben');
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/users/1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'APPROVED' }),
        });
      });
      expect(mockShowSuccessToast).toHaveBeenCalledWith('Benutzer freigegeben');
    });

    it('rejects pending user on click', async () => {
      const pendingUser = mockUsersData[0];

      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (url === '/api/admin/users' && !options?.method) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ users: [pendingUser] }),
          });
        }
        if (url === `/api/admin/users/${pendingUser.id}` && options?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ user: { ...pendingUser, status: 'REJECTED' } }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Pending User')).toBeInTheDocument();
      });

      const rejectButton = screen.getByTitle('Ablehnen');
      fireEvent.click(rejectButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/users/1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'REJECTED' }),
        });
      });
    });

    it('promotes user to admin', async () => {
      const activeUser = mockUsersData[1];

      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (url === '/api/admin/users' && !options?.method) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ users: [activeUser] }),
          });
        }
        if (url === `/api/admin/users/${activeUser.id}` && options?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ user: { ...activeUser, role: 'ADMIN' } }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Active User')).toBeInTheDocument();
      });

      const promoteButton = screen.getByTitle('Zum Admin machen');
      fireEvent.click(promoteButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/users/2', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'ADMIN' }),
        });
      });
      expect(mockShowSuccessToast).toHaveBeenCalledWith('Zum Admin befördert');
    });

    it('shows error toast when role change fails', async () => {
      const activeUser = mockUsersData[1];

      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (url === '/api/admin/users' && !options?.method) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ users: [activeUser] }),
          });
        }
        if (url === `/api/admin/users/${activeUser.id}` && options?.method === 'PUT') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Cannot promote' }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
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
      setupFetchMock([pendingUser]);

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

      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (url === '/api/admin/users' && !options?.method) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ users: [pendingUser] }),
          });
        }
        if (url === `/api/admin/users/${pendingUser.id}` && options?.method === 'DELETE') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
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
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/users/1', { method: 'DELETE' });
      });
      expect(mockShowSuccessToast).toHaveBeenCalledWith('Benutzer gelöscht');
    });
  });

  describe('display', () => {
    it('falls back to username when displayName is null', async () => {
      const userWithoutDisplayName = { ...mockUsersData[0], displayName: null };
      setupFetchMock([userWithoutDisplayName]);

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('pending_user')).toBeInTheDocument();
      });
    });

    it('hides pending users section when none exist', async () => {
      setupFetchMock([mockUsersData[1]]); // Only APPROVED user

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Active User')).toBeInTheDocument();
      });
      expect(screen.queryByText(/Ausstehende Freigaben/)).not.toBeInTheDocument();
    });

    it('shows no active users message when none exist', async () => {
      setupFetchMock([mockUsersData[0]]); // Only PENDING user

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Keine aktiven Benutzer vorhanden.')).toBeInTheDocument();
      });
    });
  });

  describe('suspend and reactivate', () => {
    it('suspends user when confirmed', async () => {
      const activeUser = mockUsersData[1];

      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (url === '/api/admin/users' && !options?.method) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ users: [activeUser] }),
          });
        }
        if (url === `/api/admin/users/${activeUser.id}` && options?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ user: { ...activeUser, status: 'SUSPENDED' } }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
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
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/users/2', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'SUSPENDED' }),
        });
      });
    });

    it('reactivates suspended user', async () => {
      const suspendedUser = mockUsersData[3];

      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (url === '/api/admin/users' && !options?.method) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ users: [suspendedUser] }),
          });
        }
        if (url === `/api/admin/users/${suspendedUser.id}` && options?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ user: { ...suspendedUser, status: 'APPROVED' } }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Suspended User')).toBeInTheDocument();
      });

      const reactivateButton = screen.getByTitle('Reaktivieren');
      fireEvent.click(reactivateButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/users/4', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'APPROVED' }),
        });
      });
    });
  });

  describe('demote admin', () => {
    it('demotes admin when confirmed', async () => {
      const adminUser = mockUsersData[2];

      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (url === '/api/admin/users' && !options?.method) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ users: [adminUser] }),
          });
        }
        if (url === `/api/admin/users/${adminUser.id}` && options?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ user: { ...adminUser, role: 'USER' } }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
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
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/users/3', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'USER' }),
        });
      });
      expect(mockShowSuccessToast).toHaveBeenCalledWith('Adminrechte entzogen');
    });
  });

  describe('password reset', () => {
    it('resets password and shows result modal', async () => {
      const activeUser = mockUsersData[1];

      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (url === '/api/admin/users' && !options?.method) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ users: [activeUser] }),
          });
        }
        if (
          url === `/api/admin/users/${activeUser.id}/reset-password` &&
          options?.method === 'POST'
        ) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ newPassword: 'TempPass123' }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      renderWithMantine(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Active User')).toBeInTheDocument();
      });

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
      expect(mockShowSuccessToast).toHaveBeenCalledWith('Passwort wurde zurückgesetzt');
    });
  });

  describe('error handling', () => {
    it('handles unknown errors gracefully', async () => {
      const activeUser = mockUsersData[1];

      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (url === '/api/admin/users' && !options?.method) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ users: [activeUser] }),
          });
        }
        return Promise.reject('Network error');
      });

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
