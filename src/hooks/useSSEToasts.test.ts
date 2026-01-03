import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as toast from '@/lib/toast/toast';
import { useProphecyStore } from '@/store/useProphecyStore';
import { useRoundStore } from '@/store/useRoundStore';
import { useUserStore } from '@/store/useUserStore';

import { useSSEToasts } from './useSSEToasts';

// Mock the toast module
vi.mock('@/lib/toast/toast', () => ({
  showInfoToast: vi.fn(),
}));

describe('useSSEToasts', () => {
  const mockShowInfoToast = vi.mocked(toast.showInfoToast);

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset stores
    useUserStore.setState({
      users: {
        user1: {
          id: 'user1',
          username: 'currentuser',
          displayName: 'Current User',
          role: 'USER',
          status: 'APPROVED',
        },
        user2: {
          id: 'user2',
          username: 'otheruser',
          displayName: 'Other User',
          role: 'USER',
          status: 'APPROVED',
        },
        admin1: {
          id: 'admin1',
          username: 'admin',
          displayName: 'Admin User',
          role: 'ADMIN',
          status: 'APPROVED',
        },
      },
      currentUserId: 'user1',
      isInitialized: true,
      isLoading: false,
      error: null,
      connectionStatus: 'connected',
    });

    useProphecyStore.setState({
      prophecies: {
        prophecy1: {
          id: 'prophecy1',
          title: 'Test Prophecy',
          description: 'A test prophecy',
          creatorId: 'user1',
          roundId: 'round1',
          createdAt: '2024-01-01',
          fulfilled: null,
          resolvedAt: null,
        },
        prophecy2: {
          id: 'prophecy2',
          title: 'Other Prophecy',
          description: 'Another prophecy',
          creatorId: 'user2',
          roundId: 'round1',
          createdAt: '2024-01-01',
          fulfilled: null,
          resolvedAt: null,
        },
      },
      isLoading: false,
      error: null,
    });

    useRoundStore.setState({
      rounds: {
        round1: {
          id: 'round1',
          title: 'Test Round',
          submissionDeadline: '2024-12-01',
          ratingDeadline: '2024-12-15',
          fulfillmentDate: '2025-01-01',
          resultsPublishedAt: null,
          createdAt: '2024-01-01',
        },
      },
      isLoading: false,
      error: null,
    });
  });

  describe('onProphecyCreated', () => {
    it('does not show toast when prophecy is created by current user', () => {
      const { result } = renderHook(() => useSSEToasts());

      act(() => {
        result.current.onProphecyCreated?.({
          id: 'new-prophecy',
          title: 'My New Prophecy',
          description: 'Description',
          creatorId: 'user1', // current user
          roundId: 'round1',
          createdAt: '2024-01-02',
          fulfilled: null,
          resolvedAt: null,
        });
      });

      expect(mockShowInfoToast).not.toHaveBeenCalled();
    });

    it('shows toast when prophecy is created by another user', () => {
      const { result } = renderHook(() => useSSEToasts());

      act(() => {
        result.current.onProphecyCreated?.({
          id: 'new-prophecy',
          title: 'Their New Prophecy',
          description: 'Description',
          creatorId: 'user2', // other user
          roundId: 'round1',
          createdAt: '2024-01-02',
          fulfilled: null,
          resolvedAt: null,
        });
      });

      expect(mockShowInfoToast).toHaveBeenCalledWith(
        'Other User hat eine neue Prophezeiung erstellt',
        expect.stringContaining('Their New Prophecy')
      );
    });

    it('falls back to "Jemand" when user is not found', () => {
      const { result } = renderHook(() => useSSEToasts());

      act(() => {
        result.current.onProphecyCreated?.({
          id: 'new-prophecy',
          title: 'Unknown Prophecy',
          description: 'Description',
          creatorId: 'unknown-user',
          roundId: 'round1',
          createdAt: '2024-01-02',
          fulfilled: null,
          resolvedAt: null,
        });
      });

      expect(mockShowInfoToast).toHaveBeenCalledWith(
        'Jemand hat eine neue Prophezeiung erstellt',
        expect.any(String)
      );
    });
  });

  describe('onRatingCreated', () => {
    it('does not show toast when current user rates a prophecy', () => {
      const { result } = renderHook(() => useSSEToasts());

      act(() => {
        result.current.onRatingCreated?.({
          id: 'rating1',
          value: 5,
          prophecyId: 'prophecy2',
          userId: 'user1', // current user rating
          createdAt: '2024-01-02',
        });
      });

      expect(mockShowInfoToast).not.toHaveBeenCalled();
    });

    it('does not show toast when someone rates another users prophecy', () => {
      const { result } = renderHook(() => useSSEToasts());

      act(() => {
        result.current.onRatingCreated?.({
          id: 'rating1',
          value: 5,
          prophecyId: 'prophecy2', // user2's prophecy
          userId: 'admin1', // admin rating
          createdAt: '2024-01-02',
        });
      });

      // Current user is user1, prophecy2 belongs to user2, so no toast
      expect(mockShowInfoToast).not.toHaveBeenCalled();
    });

    it('shows toast when someone rates current users prophecy', () => {
      const { result } = renderHook(() => useSSEToasts());

      act(() => {
        result.current.onRatingCreated?.({
          id: 'rating1',
          value: 5,
          prophecyId: 'prophecy1', // user1's prophecy (current user)
          userId: 'user2', // other user rating
          createdAt: '2024-01-02',
        });
      });

      expect(mockShowInfoToast).toHaveBeenCalledWith(
        'Other User hat deine Prophezeiung bewertet',
        'Test Prophecy'
      );
    });
  });

  describe('onRoundCreated', () => {
    it('shows toast when a new round is created', () => {
      const { result } = renderHook(() => useSSEToasts());

      act(() => {
        result.current.onRoundCreated?.({
          id: 'round2',
          title: 'New Round',
          submissionDeadline: '2024-12-01',
          ratingDeadline: '2024-12-15',
          fulfillmentDate: '2025-01-01',
          resultsPublishedAt: null,
          createdAt: '2024-01-02',
        });
      });

      expect(mockShowInfoToast).toHaveBeenCalledWith('Neue Runde erstellt', 'New Round');
    });
  });

  describe('onRoundUpdated', () => {
    it('shows toast when results are published', () => {
      const { result } = renderHook(() => useSSEToasts());

      const previousRound = {
        id: 'round1',
        title: 'Test Round',
        submissionDeadline: '2024-12-01',
        ratingDeadline: '2024-12-15',
        fulfillmentDate: '2025-01-01',
        resultsPublishedAt: null,
        createdAt: '2024-01-01',
      };

      const updatedRound = {
        ...previousRound,
        resultsPublishedAt: '2024-12-20',
      };

      act(() => {
        result.current.onRoundUpdated?.(updatedRound, previousRound);
      });

      expect(mockShowInfoToast).toHaveBeenCalledWith('Ergebnisse veröffentlicht', 'Test Round');
    });

    it('does not show toast for other round updates', () => {
      const { result } = renderHook(() => useSSEToasts());

      const previousRound = {
        id: 'round1',
        title: 'Test Round',
        submissionDeadline: '2024-12-01',
        ratingDeadline: '2024-12-15',
        fulfillmentDate: '2025-01-01',
        resultsPublishedAt: null,
        createdAt: '2024-01-01',
      };

      const updatedRound = {
        ...previousRound,
        title: 'Updated Round Title',
      };

      act(() => {
        result.current.onRoundUpdated?.(updatedRound, previousRound);
      });

      expect(mockShowInfoToast).not.toHaveBeenCalled();
    });
  });

  describe('onUserUpdated', () => {
    it('does not show toast for non-admin users', () => {
      const { result } = renderHook(() => useSSEToasts());

      const previousUser = {
        id: 'newuser',
        username: 'newuser',
        displayName: 'New User',
        role: 'USER',
        status: 'PENDING',
      };

      const updatedUser = {
        ...previousUser,
        status: 'APPROVED',
      };

      act(() => {
        result.current.onUserUpdated?.(updatedUser, previousUser);
      });

      // Current user is 'user1' with role 'USER', not ADMIN
      expect(mockShowInfoToast).not.toHaveBeenCalled();
    });

    it('shows toast for admin when user is approved', () => {
      // Set current user to admin
      useUserStore.setState({
        ...useUserStore.getState(),
        currentUserId: 'admin1',
      });

      const { result } = renderHook(() => useSSEToasts());

      const previousUser = {
        id: 'newuser',
        username: 'newuser',
        displayName: 'New User',
        role: 'USER',
        status: 'PENDING',
      };

      const updatedUser = {
        ...previousUser,
        status: 'APPROVED',
      };

      act(() => {
        result.current.onUserUpdated?.(updatedUser, previousUser);
      });

      expect(mockShowInfoToast).toHaveBeenCalledWith('Neuer Benutzer freigeschaltet', 'New User');
    });
  });
});
