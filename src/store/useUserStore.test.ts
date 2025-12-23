import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { useUserStore, type User } from './useUserStore';

describe('useUserStore', () => {
  const mockUser: User = {
    id: 'user-1',
    username: 'testuser',
    displayName: 'Test User',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: '2024-12-01T00:00:00Z',
    _count: { prophecies: 5, ratings: 10 },
  };

  const mockUser2: User = {
    id: 'user-2',
    username: 'admin',
    displayName: 'Admin User',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: '2024-11-01T00:00:00Z',
    _count: { prophecies: 15, ratings: 30 },
  };

  beforeEach(() => {
    useUserStore.setState({
      users: [],
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('has empty users array', () => {
      expect(useUserStore.getState().users).toEqual([]);
    });

    it('is not loading', () => {
      expect(useUserStore.getState().isLoading).toBe(false);
    });

    it('has no error', () => {
      expect(useUserStore.getState().error).toBeNull();
    });
  });

  describe('setUsers', () => {
    it('sets users array', () => {
      const { setUsers } = useUserStore.getState();

      act(() => {
        setUsers([mockUser, mockUser2]);
      });

      const { users } = useUserStore.getState();
      expect(users).toHaveLength(2);
      expect(users[0].username).toBe('testuser');
    });

    it('replaces existing users', () => {
      useUserStore.setState({ users: [mockUser] });
      const { setUsers } = useUserStore.getState();

      act(() => {
        setUsers([mockUser2]);
      });

      expect(useUserStore.getState().users).toHaveLength(1);
      expect(useUserStore.getState().users[0].id).toBe('user-2');
    });
  });

  describe('updateUser', () => {
    it('updates existing user', () => {
      useUserStore.setState({ users: [mockUser, mockUser2] });
      const { updateUser } = useUserStore.getState();

      act(() => {
        updateUser({ ...mockUser, displayName: 'Updated Name' });
      });

      const { users } = useUserStore.getState();
      expect(users[0].displayName).toBe('Updated Name');
      expect(users[1].displayName).toBe('Admin User');
    });

    it('preserves order when updating', () => {
      useUserStore.setState({ users: [mockUser, mockUser2] });
      const { updateUser } = useUserStore.getState();

      act(() => {
        updateUser({ ...mockUser2, status: 'INACTIVE' });
      });

      const { users } = useUserStore.getState();
      expect(users[0].id).toBe('user-1');
      expect(users[1].id).toBe('user-2');
      expect(users[1].status).toBe('INACTIVE');
    });

    it('handles non-existent user (no-op)', () => {
      useUserStore.setState({ users: [mockUser] });
      const { updateUser } = useUserStore.getState();

      act(() => {
        updateUser({ ...mockUser2, displayName: 'Ghost' });
      });

      expect(useUserStore.getState().users).toHaveLength(1);
      expect(useUserStore.getState().users[0].id).toBe('user-1');
    });
  });

  describe('setLoading', () => {
    it('sets loading to true', () => {
      const { setLoading } = useUserStore.getState();

      act(() => {
        setLoading(true);
      });

      expect(useUserStore.getState().isLoading).toBe(true);
    });

    it('sets loading to false', () => {
      useUserStore.setState({ isLoading: true });
      const { setLoading } = useUserStore.getState();

      act(() => {
        setLoading(false);
      });

      expect(useUserStore.getState().isLoading).toBe(false);
    });
  });

  describe('setError', () => {
    it('sets error message', () => {
      const { setError } = useUserStore.getState();

      act(() => {
        setError('Failed to load');
      });

      expect(useUserStore.getState().error).toBe('Failed to load');
    });

    it('clears error', () => {
      useUserStore.setState({ error: 'Old error' });
      const { setError } = useUserStore.getState();

      act(() => {
        setError(null);
      });

      expect(useUserStore.getState().error).toBeNull();
    });
  });

  describe('fetchUsers', () => {
    it('sets loading during fetch', async () => {
      const mockFetch = vi.fn(() =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({ users: [] }),
            });
          }, 10);
        })
      ) as unknown as typeof fetch;

      vi.stubGlobal('fetch', mockFetch);

      const fetchPromise = useUserStore.getState().fetchUsers();
      expect(useUserStore.getState().isLoading).toBe(true);

      await fetchPromise;
      expect(useUserStore.getState().isLoading).toBe(false);
    });

    it('fetches and sets users on success', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ users: [mockUser, mockUser2] }),
        })
      ) as unknown as typeof fetch;

      vi.stubGlobal('fetch', mockFetch);

      await useUserStore.getState().fetchUsers();

      expect(useUserStore.getState().users).toHaveLength(2);
      expect(useUserStore.getState().error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/users');
    });

    it('sets error on API failure', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({ ok: false })
      ) as unknown as typeof fetch;

      vi.stubGlobal('fetch', mockFetch);

      await useUserStore.getState().fetchUsers();

      expect(useUserStore.getState().error).toBe('Fehler beim Laden der Benutzer');
      expect(useUserStore.getState().isLoading).toBe(false);
    });

    it('sets error on network failure', async () => {
      const mockFetch = vi.fn(() =>
        Promise.reject(new Error('Network error'))
      ) as unknown as typeof fetch;

      vi.stubGlobal('fetch', mockFetch);

      await useUserStore.getState().fetchUsers();

      expect(useUserStore.getState().error).toBe('Network error');
    });

    it('sets generic error for non-Error exceptions', async () => {
      const mockFetch = vi.fn(() =>
        Promise.reject('Unknown')
      ) as unknown as typeof fetch;

      vi.stubGlobal('fetch', mockFetch);

      await useUserStore.getState().fetchUsers();

      expect(useUserStore.getState().error).toBe('Unbekannter Fehler');
    });

    it('clears previous error on new fetch', async () => {
      useUserStore.setState({ error: 'Previous error' });

      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ users: [] }),
        })
      ) as unknown as typeof fetch;

      vi.stubGlobal('fetch', mockFetch);

      await useUserStore.getState().fetchUsers();

      expect(useUserStore.getState().error).toBeNull();
    });
  });
});
