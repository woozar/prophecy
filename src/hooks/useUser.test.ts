import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useUserStore } from '@/store/useUserStore';

import { useCurrentUser, useUser } from './useUser';

describe('useUser hook', () => {
  const mockUser1 = {
    id: 'user-1',
    username: 'testuser1',
    displayName: 'Test User 1',
    avatarUrl: null,
    avatarEffect: null,
    avatarEffectColors: undefined,
    role: 'USER' as const,
    status: 'APPROVED' as const,
    createdAt: '2025-01-01T00:00:00Z',
  };

  const mockUser2 = {
    id: 'user-2',
    username: 'testuser2',
    displayName: 'Test User 2',
    avatarUrl: '/api/uploads/avatars/test.webp',
    avatarEffect: 'glow',
    avatarEffectColors: ['cyan', 'teal'],
    role: 'ADMIN' as const,
    status: 'APPROVED' as const,
    createdAt: '2025-01-02T00:00:00Z',
  };

  beforeEach(() => {
    useUserStore.setState({
      users: {},
      currentUserId: null,
    });
  });

  describe('useUser', () => {
    it('returns user when found in store', () => {
      act(() => {
        useUserStore.setState({
          users: { 'user-1': mockUser1 },
        });
      });

      const { result } = renderHook(() => useUser('user-1'));
      expect(result.current).toEqual(mockUser1);
    });

    it('returns undefined when user not found', () => {
      act(() => {
        useUserStore.setState({
          users: { 'user-1': mockUser1 },
        });
      });

      const { result } = renderHook(() => useUser('non-existent'));
      expect(result.current).toBeUndefined();
    });

    it('returns undefined when userId is undefined', () => {
      act(() => {
        useUserStore.setState({
          users: { 'user-1': mockUser1 },
        });
      });

      const { result } = renderHook(() => useUser(undefined));
      expect(result.current).toBeUndefined();
    });

    it('updates when user data changes', () => {
      act(() => {
        useUserStore.setState({
          users: { 'user-1': mockUser1 },
        });
      });

      const { result, rerender } = renderHook(() => useUser('user-1'));
      expect(result.current?.displayName).toBe('Test User 1');

      act(() => {
        useUserStore.getState().setUser({
          ...mockUser1,
          displayName: 'Updated Name',
        });
      });

      rerender();
      expect(result.current?.displayName).toBe('Updated Name');
    });

    it('handles multiple users', () => {
      act(() => {
        useUserStore.setState({
          users: { 'user-1': mockUser1, 'user-2': mockUser2 },
        });
      });

      const { result: result1 } = renderHook(() => useUser('user-1'));
      const { result: result2 } = renderHook(() => useUser('user-2'));

      expect(result1.current).toEqual(mockUser1);
      expect(result2.current).toEqual(mockUser2);
    });
  });

  describe('useCurrentUser', () => {
    it('returns current user when logged in', () => {
      act(() => {
        useUserStore.setState({
          users: { 'user-1': mockUser1 },
          currentUserId: 'user-1',
        });
      });

      const { result } = renderHook(() => useCurrentUser());
      expect(result.current).toEqual(mockUser1);
    });

    it('returns undefined when not logged in', () => {
      act(() => {
        useUserStore.setState({
          users: { 'user-1': mockUser1 },
          currentUserId: null,
        });
      });

      const { result } = renderHook(() => useCurrentUser());
      expect(result.current).toBeUndefined();
    });

    it('returns undefined when currentUserId does not match any user', () => {
      act(() => {
        useUserStore.setState({
          users: { 'user-1': mockUser1 },
          currentUserId: 'non-existent',
        });
      });

      const { result } = renderHook(() => useCurrentUser());
      expect(result.current).toBeUndefined();
    });

    it('updates when current user data changes', () => {
      act(() => {
        useUserStore.setState({
          users: { 'user-1': mockUser1 },
          currentUserId: 'user-1',
        });
      });

      const { result, rerender } = renderHook(() => useCurrentUser());
      expect(result.current?.avatarUrl).toBeNull();

      act(() => {
        useUserStore.getState().setUser({
          ...mockUser1,
          avatarUrl: '/api/uploads/avatars/new.webp',
        });
      });

      rerender();
      expect(result.current?.avatarUrl).toBe('/api/uploads/avatars/new.webp');
    });

    it('updates when currentUserId changes', () => {
      act(() => {
        useUserStore.setState({
          users: { 'user-1': mockUser1, 'user-2': mockUser2 },
          currentUserId: 'user-1',
        });
      });

      const { result, rerender } = renderHook(() => useCurrentUser());
      expect(result.current).toEqual(mockUser1);

      act(() => {
        useUserStore.setState({ currentUserId: 'user-2' });
      });

      rerender();
      expect(result.current).toEqual(mockUser2);
    });
  });
});
