import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  type User,
  selectAllUsers,
  selectCurrentUser,
  selectUserById,
  useUserStore,
} from './useUserStore';

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
      connectionStatus: 'disconnected',
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

    it('skips update when user data is unchanged', () => {
      const userWithAvatar: User = {
        ...mockUser,
        avatarUrl: 'https://example.com/avatar.png',
        avatarEffect: 'glow',
        avatarEffectColors: ['#ff0000', '#00ff00'],
      };
      useUserStore.setState({ users: { 'user-1': userWithAvatar } });

      const stateBefore = useUserStore.getState().users;
      const { setUser } = useUserStore.getState();

      act(() => {
        // Same data, different object reference
        setUser({ ...userWithAvatar, avatarEffectColors: ['#ff0000', '#00ff00'] });
      });

      const stateAfter = useUserStore.getState().users;
      // Should be exact same object reference (no state update)
      expect(stateAfter).toBe(stateBefore);
    });

    it('updates when avatarUrl changes', () => {
      const userWithAvatar: User = {
        ...mockUser,
        avatarUrl: 'https://example.com/old-avatar.png',
      };
      useUserStore.setState({ users: { 'user-1': userWithAvatar } });

      const stateBefore = useUserStore.getState().users;
      const { setUser } = useUserStore.getState();

      act(() => {
        setUser({ ...userWithAvatar, avatarUrl: 'https://example.com/new-avatar.png' });
      });

      const stateAfter = useUserStore.getState().users;
      expect(stateAfter).not.toBe(stateBefore);
      expect(stateAfter['user-1'].avatarUrl).toBe('https://example.com/new-avatar.png');
    });

    it('updates when avatarEffect changes', () => {
      const userWithAvatar: User = {
        ...mockUser,
        avatarEffect: 'glow',
      };
      useUserStore.setState({ users: { 'user-1': userWithAvatar } });

      const { setUser } = useUserStore.getState();

      act(() => {
        setUser({ ...userWithAvatar, avatarEffect: 'sparkle' });
      });

      expect(useUserStore.getState().users['user-1'].avatarEffect).toBe('sparkle');
    });

    it('updates when avatarEffectColors changes', () => {
      const userWithAvatar: User = {
        ...mockUser,
        avatarEffectColors: ['#ff0000'],
      };
      useUserStore.setState({ users: { 'user-1': userWithAvatar } });

      const { setUser } = useUserStore.getState();

      act(() => {
        setUser({ ...userWithAvatar, avatarEffectColors: ['#ff0000', '#00ff00'] });
      });

      expect(useUserStore.getState().users['user-1'].avatarEffectColors).toEqual([
        '#ff0000',
        '#00ff00',
      ]);
    });

    it('updates when role changes', () => {
      useUserStore.setState({ users: { 'user-1': mockUser } });
      const { setUser } = useUserStore.getState();

      act(() => {
        setUser({ ...mockUser, role: 'ADMIN' });
      });

      expect(useUserStore.getState().users['user-1'].role).toBe('ADMIN');
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

  describe('selectUserById', () => {
    it('returns user by id', () => {
      useUserStore.setState({ users: { 'user-1': mockUser, 'user-2': mockUser2 } });

      const selector = selectUserById('user-1');
      const result = selector(useUserStore.getState());

      expect(result).toEqual(mockUser);
    });

    it('returns undefined for unknown id', () => {
      useUserStore.setState({ users: { 'user-1': mockUser } });

      const selector = selectUserById('unknown-id');
      const result = selector(useUserStore.getState());

      expect(result).toBeUndefined();
    });

    it('returns undefined when users is empty', () => {
      const selector = selectUserById('user-1');
      const result = selector(useUserStore.getState());

      expect(result).toBeUndefined();
    });
  });

  describe('selectCurrentUser', () => {
    it('returns current user when logged in', () => {
      useUserStore.setState({
        users: { 'user-1': mockUser, 'user-2': mockUser2 },
        currentUserId: 'user-1',
      });

      const result = selectCurrentUser(useUserStore.getState());

      expect(result).toEqual(mockUser);
    });

    it('returns undefined when not logged in', () => {
      useUserStore.setState({
        users: { 'user-1': mockUser },
        currentUserId: null,
      });

      const result = selectCurrentUser(useUserStore.getState());

      expect(result).toBeUndefined();
    });

    it('returns undefined when currentUserId does not exist in users', () => {
      useUserStore.setState({
        users: { 'user-1': mockUser },
        currentUserId: 'deleted-user',
      });

      const result = selectCurrentUser(useUserStore.getState());

      expect(result).toBeUndefined();
    });
  });

  describe('selectAllUsers', () => {
    it('returns all users as array', () => {
      useUserStore.setState({ users: { 'user-1': mockUser, 'user-2': mockUser2 } });

      const result = selectAllUsers(useUserStore.getState());

      expect(result).toHaveLength(2);
      expect(result).toContainEqual(mockUser);
      expect(result).toContainEqual(mockUser2);
    });

    it('returns empty array when no users', () => {
      const result = selectAllUsers(useUserStore.getState());

      expect(result).toEqual([]);
    });

    it('returns single user array', () => {
      useUserStore.setState({ users: { 'user-1': mockUser } });

      const result = selectAllUsers(useUserStore.getState());

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockUser);
    });
  });

  describe('connectionStatus', () => {
    it('has initial status disconnected', () => {
      expect(useUserStore.getState().connectionStatus).toBe('disconnected');
    });

    it('can be set to connected', () => {
      const { setConnectionStatus } = useUserStore.getState();

      act(() => {
        setConnectionStatus('connected');
      });

      expect(useUserStore.getState().connectionStatus).toBe('connected');
    });

    it('can be set to connecting', () => {
      const { setConnectionStatus } = useUserStore.getState();

      act(() => {
        setConnectionStatus('connecting');
      });

      expect(useUserStore.getState().connectionStatus).toBe('connecting');
    });

    it('can be set back to disconnected', () => {
      const { setConnectionStatus } = useUserStore.getState();

      act(() => {
        setConnectionStatus('connected');
      });
      act(() => {
        setConnectionStatus('disconnected');
      });

      expect(useUserStore.getState().connectionStatus).toBe('disconnected');
    });
  });
});
