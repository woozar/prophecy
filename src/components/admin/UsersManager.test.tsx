import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { UsersManager } from './UsersManager';
import { MantineProvider } from '@mantine/core';
import { showSuccessToast, showErrorToast } from '@/lib/toast/toast';

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
const mockSetUsers = vi.fn();
const mockUpdateUser = vi.fn();
const mockFetchUsers = vi.fn();
let mockUsers: Array<{
  id: string;
  username: string;
  displayName: string | null;
  status: string;
  role: string;
  createdAt: string;
  _count?: { prophecies: number; ratings: number };
}> = [];

vi.mock('@/store/useUserStore', () => ({
  useUserStore: Object.assign(
    () => ({
      users: mockUsers,
      setUsers: mockSetUsers,
      updateUser: mockUpdateUser,
    }),
    {
      getState: () => ({
        fetchUsers: mockFetchUsers,
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

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsers = [];
  });

  it('shows pending users section when there are pending users', () => {
    mockUsers = mockUsersData;
    render(<UsersManager initialUsers={mockUsersData} />);
    expect(screen.getByText(/Ausstehende Freigaben \(1\)/)).toBeInTheDocument();
  });

  it('shows active users section', () => {
    mockUsers = mockUsersData;
    render(<UsersManager initialUsers={mockUsersData} />);
    expect(screen.getByText(/Aktive Benutzer \(2\)/)).toBeInTheDocument();
  });

  it('shows other users section for suspended/rejected users', () => {
    mockUsers = mockUsersData;
    render(<UsersManager initialUsers={mockUsersData} />);
    expect(screen.getByText(/Sonstige \(1\)/)).toBeInTheDocument();
  });

  it('displays user display names', () => {
    mockUsers = mockUsersData;
    render(<UsersManager initialUsers={mockUsersData} />);
    expect(screen.getByText('Pending User')).toBeInTheDocument();
    expect(screen.getByText('Active User')).toBeInTheDocument();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
  });

  it('displays usernames with @ prefix', () => {
    mockUsers = mockUsersData;
    render(<UsersManager initialUsers={mockUsersData} />);
    expect(screen.getByText(/@pending_user/)).toBeInTheDocument();
    expect(screen.getByText(/@active_user/)).toBeInTheDocument();
  });

  it('shows admin badge for admin users', () => {
    mockUsers = mockUsersData;
    render(<UsersManager initialUsers={mockUsersData} />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('shows status badges', () => {
    mockUsers = mockUsersData;
    render(<UsersManager initialUsers={mockUsersData} />);
    expect(screen.getByText('Ausstehend')).toBeInTheDocument();
    expect(screen.getAllByText('Freigegeben').length).toBe(2);
    expect(screen.getByText('Gesperrt')).toBeInTheDocument();
  });

  it('shows prophecy and rating counts', () => {
    mockUsers = mockUsersData;
    render(<UsersManager initialUsers={mockUsersData} />);
    expect(screen.getByText(/5 Prophezeiungen/)).toBeInTheDocument();
    expect(screen.getByText(/10 Bewertungen/)).toBeInTheDocument();
  });

  it('shows empty state when no active users', () => {
    mockUsers = [mockUsersData[0]]; // Only pending user
    render(<UsersManager initialUsers={[mockUsersData[0]]} />);
    expect(screen.getByText('Keine aktiven Benutzer vorhanden.')).toBeInTheDocument();
  });

  it('shows approve button for pending users', () => {
    mockUsers = [mockUsersData[0]];
    render(<UsersManager initialUsers={[mockUsersData[0]]} />);
    expect(screen.getByTitle('Freigeben')).toBeInTheDocument();
  });

  it('shows reject button for pending users', () => {
    mockUsers = [mockUsersData[0]];
    render(<UsersManager initialUsers={[mockUsersData[0]]} />);
    expect(screen.getByTitle('Ablehnen')).toBeInTheDocument();
  });

  it('shows suspend button for active users', () => {
    mockUsers = [mockUsersData[1]];
    render(<UsersManager initialUsers={[mockUsersData[1]]} />);
    expect(screen.getByTitle('Sperren')).toBeInTheDocument();
  });

  it('shows admin toggle button for active users', () => {
    mockUsers = [mockUsersData[1]];
    render(<UsersManager initialUsers={[mockUsersData[1]]} />);
    expect(screen.getByTitle('Zum Admin machen')).toBeInTheDocument();
  });

  it('shows demote button for admin users', () => {
    mockUsers = [mockUsersData[2]];
    render(<UsersManager initialUsers={[mockUsersData[2]]} />);
    expect(screen.getByTitle('Adminrechte entziehen')).toBeInTheDocument();
  });

  it('shows reactivate button for suspended users', () => {
    mockUsers = [mockUsersData[3]];
    render(<UsersManager initialUsers={[mockUsersData[3]]} />);
    expect(screen.getByTitle('Reaktivieren')).toBeInTheDocument();
  });

  it('opens delete confirmation modal', async () => {
    mockUsers = mockUsersData;
    renderWithMantine(<UsersManager initialUsers={mockUsersData} />);

    const deleteButtons = screen.getAllByTitle('Löschen');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Benutzer löschen?')).toBeInTheDocument();
    });
    // Name appears both in user card and modal message
    expect(screen.getAllByText(/Pending User/).length).toBeGreaterThanOrEqual(2);
  });

  it('closes modal when cancel clicked', async () => {
    mockUsers = mockUsersData;
    renderWithMantine(<UsersManager initialUsers={mockUsersData} />);

    const deleteButtons = screen.getAllByTitle('Löschen');
    fireEvent.click(deleteButtons[0]);
    await waitFor(() => {
      expect(screen.getByText('Benutzer löschen?')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Abbrechen'));
    await waitFor(() => {
      expect(screen.queryByText('Benutzer löschen?')).not.toBeInTheDocument();
    });
  });

  it('calls approve API when approve clicked', async () => {
    mockUsers = [mockUsersData[0]];
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: { ...mockUsersData[0], status: 'APPROVED' } }),
    });
    globalThis.fetch = mockFetch;

    render(<UsersManager initialUsers={[mockUsersData[0]]} />);

    fireEvent.click(screen.getByTitle('Freigeben'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/users/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ status: 'APPROVED' }),
        })
      );
    });
  });

  it('calls delete API when delete confirmed', async () => {
    mockUsers = mockUsersData;
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    mockFetchUsers.mockResolvedValue(undefined);
    globalThis.fetch = mockFetch;

    renderWithMantine(<UsersManager initialUsers={mockUsersData} />);

    // Open delete modal
    const deleteButtons = screen.getAllByTitle('Löschen');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Benutzer löschen?')).toBeInTheDocument();
    });

    // Find the confirm button in the modal
    const allButtons = screen.getAllByRole('button');
    const confirmButton = allButtons.find(btn =>
      btn.textContent?.includes('Löschen') && !btn.hasAttribute('title')
    );
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/users/1', { method: 'DELETE' });
    });
  });

  it('initializes store with provided users', () => {
    render(<UsersManager initialUsers={mockUsersData} />);
    expect(mockSetUsers).toHaveBeenCalledWith(mockUsersData);
  });

  it('shows error toast when approve fails', async () => {
    mockUsers = [mockUsersData[0]];
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Approval failed' }),
    });
    globalThis.fetch = mockFetch;

    render(<UsersManager initialUsers={[mockUsersData[0]]} />);
    fireEvent.click(screen.getByTitle('Freigeben'));

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith('Approval failed');
    });
  });

  it('shows success toast when approve succeeds', async () => {
    mockUsers = [mockUsersData[0]];
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: { ...mockUsersData[0], status: 'APPROVED' } }),
    });
    globalThis.fetch = mockFetch;

    render(<UsersManager initialUsers={[mockUsersData[0]]} />);
    fireEvent.click(screen.getByTitle('Freigeben'));

    await waitFor(() => {
      expect(mockShowSuccessToast).toHaveBeenCalledWith('Benutzer freigegeben');
    });
    expect(mockUpdateUser).toHaveBeenCalled();
  });

  it('calls reject API when reject clicked', async () => {
    mockUsers = [mockUsersData[0]];
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: { ...mockUsersData[0], status: 'REJECTED' } }),
    });
    globalThis.fetch = mockFetch;

    render(<UsersManager initialUsers={[mockUsersData[0]]} />);
    fireEvent.click(screen.getByTitle('Ablehnen'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/users/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ status: 'REJECTED' }),
        })
      );
    });
    expect(mockShowSuccessToast).toHaveBeenCalledWith('Benutzer abgelehnt');
  });

  it('calls promote to admin API', async () => {
    mockUsers = [mockUsersData[1]]; // Active non-admin user
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: { ...mockUsersData[1], role: 'ADMIN' } }),
    });
    globalThis.fetch = mockFetch;

    render(<UsersManager initialUsers={[mockUsersData[1]]} />);
    fireEvent.click(screen.getByTitle('Zum Admin machen'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/users/2',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ role: 'ADMIN' }),
        })
      );
    });
    expect(mockShowSuccessToast).toHaveBeenCalledWith('Zum Admin befördert');
  });

  it('opens demote confirmation modal for admin', async () => {
    mockUsers = [mockUsersData[2]]; // Admin user
    renderWithMantine(<UsersManager initialUsers={[mockUsersData[2]]} />);

    fireEvent.click(screen.getByTitle('Adminrechte entziehen'));

    await waitFor(() => {
      expect(screen.getByText('Adminrechte entziehen?')).toBeInTheDocument();
    });
  });

  it('demotes admin when confirmed', async () => {
    mockUsers = [mockUsersData[2]]; // Admin user
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: { ...mockUsersData[2], role: 'USER' } }),
    });
    globalThis.fetch = mockFetch;

    renderWithMantine(<UsersManager initialUsers={[mockUsersData[2]]} />);
    fireEvent.click(screen.getByTitle('Adminrechte entziehen'));

    await waitFor(() => {
      expect(screen.getByText('Adminrechte entziehen?')).toBeInTheDocument();
    });

    const confirmButton = screen.getAllByRole('button').find(btn =>
      btn.textContent?.includes('Rechte entziehen')
    );
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/users/3',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ role: 'USER' }),
        })
      );
    });
    expect(mockShowSuccessToast).toHaveBeenCalledWith('Adminrechte entzogen');
  });

  it('opens suspend confirmation modal', async () => {
    mockUsers = [mockUsersData[1]]; // Active user
    renderWithMantine(<UsersManager initialUsers={[mockUsersData[1]]} />);

    fireEvent.click(screen.getByTitle('Sperren'));

    await waitFor(() => {
      expect(screen.getByText('Benutzer sperren?')).toBeInTheDocument();
    });
  });

  it('suspends user when confirmed', async () => {
    mockUsers = [mockUsersData[1]]; // Active user
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: { ...mockUsersData[1], status: 'SUSPENDED' } }),
    });
    globalThis.fetch = mockFetch;

    renderWithMantine(<UsersManager initialUsers={[mockUsersData[1]]} />);
    fireEvent.click(screen.getByTitle('Sperren'));

    await waitFor(() => {
      expect(screen.getByText('Benutzer sperren?')).toBeInTheDocument();
    });

    const confirmButton = screen.getAllByRole('button').find(btn =>
      btn.textContent?.includes('Sperren') && !btn.hasAttribute('title')
    );
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/users/2',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ status: 'SUSPENDED' }),
        })
      );
    });
    expect(mockShowSuccessToast).toHaveBeenCalledWith('Benutzer gesperrt');
  });

  it('reactivates suspended user', async () => {
    mockUsers = [mockUsersData[3]]; // Suspended user
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: { ...mockUsersData[3], status: 'APPROVED' } }),
    });
    globalThis.fetch = mockFetch;

    render(<UsersManager initialUsers={[mockUsersData[3]]} />);
    fireEvent.click(screen.getByTitle('Reaktivieren'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/users/4',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ status: 'APPROVED' }),
        })
      );
    });
    expect(mockShowSuccessToast).toHaveBeenCalledWith('Benutzer freigegeben');
  });

  it('shows error toast when delete fails', async () => {
    mockUsers = mockUsersData;
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Cannot delete' }),
    });
    globalThis.fetch = mockFetch;

    renderWithMantine(<UsersManager initialUsers={mockUsersData} />);

    const deleteButtons = screen.getAllByTitle('Löschen');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Benutzer löschen?')).toBeInTheDocument();
    });

    const confirmButton = screen.getAllByRole('button').find(btn =>
      btn.textContent?.includes('Löschen') && !btn.hasAttribute('title')
    );
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith('Cannot delete');
    });
  });

  it('shows success toast and refetches after successful delete', async () => {
    mockUsers = mockUsersData;
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    mockFetchUsers.mockResolvedValue(undefined);
    globalThis.fetch = mockFetch;

    renderWithMantine(<UsersManager initialUsers={mockUsersData} />);

    const deleteButtons = screen.getAllByTitle('Löschen');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Benutzer löschen?')).toBeInTheDocument();
    });

    const confirmButton = screen.getAllByRole('button').find(btn =>
      btn.textContent?.includes('Löschen') && !btn.hasAttribute('title')
    );
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(mockShowSuccessToast).toHaveBeenCalledWith('Benutzer gelöscht');
    });
    expect(mockFetchUsers).toHaveBeenCalled();
  });

  it('shows error toast when role change fails', async () => {
    mockUsers = [mockUsersData[1]];
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Cannot promote' }),
    });
    globalThis.fetch = mockFetch;

    render(<UsersManager initialUsers={[mockUsersData[1]]} />);
    fireEvent.click(screen.getByTitle('Zum Admin machen'));

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith('Cannot promote');
    });
  });

  it('falls back to username when displayName is null', () => {
    const userWithoutDisplayName = {
      ...mockUsersData[0],
      displayName: null,
    };
    mockUsers = [userWithoutDisplayName];
    render(<UsersManager initialUsers={[userWithoutDisplayName]} />);
    expect(screen.getByText('pending_user')).toBeInTheDocument();
  });
});
