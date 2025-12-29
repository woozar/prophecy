import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { type User, useUserStore } from './useUserStore';

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
      users: {},
      currentUserId: null,
      isInitialized: false,
      isLoading: false,
      error: null,
    });
  });

  describe('initial state', () => {
    it('has empty users record', () => {
      expect(useUserStore.getState().users).toEqual({});
    });

    it('is not loading', () => {
      expect(useUserStore.getState().isLoading).toBe(false);
    });

    it('has no error', () => {
      expect(useUserStore.getState().error).toBeNull();
    });
  });

  describe('setUsers', () => {
    it('sets users as record', () => {
      const { setUsers } = useUserStore.getState();

      act(() => {
        setUsers([mockUser, mockUser2]);
      });

      const { users } = useUserStore.getState();
      expect(Object.keys(users)).toHaveLength(2);
      expect(users['user-1'].username).toBe('testuser');
      expect(users['user-2'].username).toBe('admin');
    });

    it('replaces existing users', () => {
      useUserStore.setState({ users: { 'user-1': mockUser } });
      const { setUsers } = useUserStore.getState();

      act(() => {
        setUsers([mockUser2]);
      });

      const { users } = useUserStore.getState();
      expect(Object.keys(users)).toHaveLength(1);
      expect(users['user-2']).toBeDefined();
      expect(users['user-1']).toBeUndefined();
    });
  });

  describe('setUser', () => {
    it('adds new user', () => {
      const { setUser } = useUserStore.getState();

      act(() => {
        setUser(mockUser);
      });

      const { users } = useUserStore.getState();
      expect(users['user-1']).toEqual(mockUser);
    });

    it('updates existing user', () => {
      useUserStore.setState({ users: { 'user-1': mockUser, 'user-2': mockUser2 } });
      const { setUser } = useUserStore.getState();

      act(() => {
        setUser({ ...mockUser, displayName: 'Updated Name' });
      });

      const { users } = useUserStore.getState();
      expect(users['user-1'].displayName).toBe('Updated Name');
      expect(users['user-2'].displayName).toBe('Admin User');
    });

    it('preserves other users when updating', () => {
      useUserStore.setState({ users: { 'user-1': mockUser, 'user-2': mockUser2 } });
      const { setUser } = useUserStore.getState();

      act(() => {
        setUser({ ...mockUser2, status: 'INACTIVE' });
      });

      const { users } = useUserStore.getState();
      expect(users['user-1']).toEqual(mockUser);
      expect(users['user-2'].status).toBe('INACTIVE');
    });
  });

  describe('removeUser', () => {
    it('removes user by id', () => {
      useUserStore.setState({ users: { 'user-1': mockUser, 'user-2': mockUser2 } });
      const { removeUser } = useUserStore.getState();

      act(() => {
        removeUser('user-1');
      });

      const { users } = useUserStore.getState();
      expect(users['user-1']).toBeUndefined();
      expect(users['user-2']).toBeDefined();
    });

    it('handles non-existent user (no-op)', () => {
      useUserStore.setState({ users: { 'user-1': mockUser } });
      const { removeUser } = useUserStore.getState();

      act(() => {
        removeUser('non-existent');
      });

      const { users } = useUserStore.getState();
      expect(Object.keys(users)).toHaveLength(1);
      expect(users['user-1']).toBeDefined();
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

  describe('setCurrentUserId', () => {
    it('sets current user id', () => {
      const { setCurrentUserId } = useUserStore.getState();

      act(() => {
        setCurrentUserId('user-1');
      });

      expect(useUserStore.getState().currentUserId).toBe('user-1');
    });
  });

  describe('setInitialized', () => {
    it('sets initialized to true', () => {
      const { setInitialized } = useUserStore.getState();

      act(() => {
        setInitialized(true);
      });

      expect(useUserStore.getState().isInitialized).toBe(true);
    });
  });
});
