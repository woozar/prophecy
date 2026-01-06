import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSSE } from './useSSE';

// Mock apiClient
const mockInitialDataGet = vi.fn();

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    initialData: {
      get: () => mockInitialDataGet(),
    },
  },
}));

// Create shared mock functions that will be reused
const mockSetRounds = vi.fn();
const mockSetRound = vi.fn();
const mockRemoveRound = vi.fn();
const mockSetUsers = vi.fn();
const mockSetUser = vi.fn();
const mockRemoveUser = vi.fn();
const mockSetCurrentUserId = vi.fn();
const mockSetInitialized = vi.fn();
const mockSetProphecies = vi.fn();
const mockSetProphecy = vi.fn();
const mockRemoveProphecy = vi.fn();
const mockSetRatings = vi.fn();
const mockSetRating = vi.fn();
const mockRemoveRating = vi.fn();
const mockAddMyBadge = vi.fn();
const mockRemoveMyBadge = vi.fn();
const mockAddUserBadge = vi.fn();
const mockRemoveUserBadge = vi.fn();

// Shared getState return values
let mockIsInitialized = false;

// Mock the stores
vi.mock('@/store/useRoundStore', () => ({
  useRoundStore: vi.fn(() => ({
    setRound: mockSetRound,
    removeRound: mockRemoveRound,
  })),
}));

vi.mock('@/store/useUserStore', () => ({
  useUserStore: vi.fn(() => ({
    setUser: mockSetUser,
    removeUser: mockRemoveUser,
    setCurrentUserId: mockSetCurrentUserId,
  })),
}));

vi.mock('@/store/useProphecyStore', () => ({
  useProphecyStore: vi.fn(() => ({
    setProphecy: mockSetProphecy,
    removeProphecy: mockRemoveProphecy,
  })),
}));

vi.mock('@/store/useRatingStore', () => ({
  useRatingStore: vi.fn(() => ({
    setRating: mockSetRating,
    removeRating: mockRemoveRating,
  })),
}));

vi.mock('@/store/useBadgeStore', () => ({
  useBadgeStore: vi.fn(() => ({
    addMyBadge: mockAddMyBadge,
    removeMyBadge: mockRemoveMyBadge,
  })),
}));

describe('useSSE', () => {
  let createdInstances: Array<{
    onopen: (() => void) | null;
    onerror: (() => void) | null;
    onmessage: (() => void) | null;
    close: ReturnType<typeof vi.fn>;
    addEventListener: ReturnType<typeof vi.fn>;
  }>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    createdInstances = [];
    // Mock console.log to suppress SSE connection logs during tests
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockIsInitialized = false;

    // Reset all mocks
    vi.clearAllMocks();

    // Configure store getState mocks
    const { useUserStore } = await import('@/store/useUserStore');
    const { useRoundStore } = await import('@/store/useRoundStore');
    const { useProphecyStore } = await import('@/store/useProphecyStore');
    const { useRatingStore } = await import('@/store/useRatingStore');
    const { useBadgeStore } = await import('@/store/useBadgeStore');

    // Mock getState for useUserStore
    useUserStore.getState = () => ({
      isInitialized: mockIsInitialized,
      setUsers: mockSetUsers,
      setCurrentUserId: mockSetCurrentUserId,
      setInitialized: mockSetInitialized,
      users: {},
      currentUserId: 'user-1',
      isLoading: false,
      error: null,
      connectionStatus: 'disconnected' as const,
      setUser: mockSetUser,
      removeUser: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
      setConnectionStatus: vi.fn(),
    });

    // Mock getState for other stores
    useRoundStore.getState = () => ({
      setRounds: mockSetRounds,
      rounds: {},
      isLoading: false,
      error: null,
      setRound: vi.fn(),
      removeRound: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
    });

    useProphecyStore.getState = () => ({
      setProphecies: mockSetProphecies,
      prophecies: {},
      isLoading: false,
      error: null,
      setProphecy: vi.fn(),
      removeProphecy: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
    });

    useRatingStore.getState = () => ({
      setRatings: mockSetRatings,
      ratings: {},
      ratingsByProphecy: {},
      isLoading: false,
      error: null,
      setRating: vi.fn(),
      removeRating: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
    });

    useBadgeStore.getState = () => ({
      badges: {},
      myBadges: {},
      allUserBadges: {},
      awardedBadges: [],
      isInitialized: true,
      isLoading: false,
      error: null,
      setBadges: vi.fn(),
      setMyBadges: vi.fn(),
      addMyBadge: mockAddMyBadge,
      removeMyBadge: mockRemoveMyBadge,
      setAllUserBadges: vi.fn(),
      addUserBadge: mockAddUserBadge,
      removeUserBadge: mockRemoveUserBadge,
      setAwardedBadges: vi.fn(),
      setInitialized: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
    });

    // Mock apiClient.initialData.get for initial data loading
    mockInitialDataGet.mockResolvedValue({
      data: {
        users: [{ id: 'user-1', username: 'test' }],
        currentUserId: 'user-1',
        rounds: [{ id: 'round-1', title: 'Test Round' }],
        prophecies: [{ id: 'prophecy-1', title: 'Test Prophecy' }],
        ratings: [{ id: 'rating-1', value: 5 }],
      },
      error: null,
    });

    // Use a proper constructor function for EventSource mock
    const MockEventSource = vi.fn(function (this: {
      onopen: (() => void) | null;
      onerror: (() => void) | null;
      onmessage: (() => void) | null;
      close: ReturnType<typeof vi.fn>;
      addEventListener: ReturnType<typeof vi.fn>;
    }) {
      this.onopen = null;
      this.onerror = null;
      this.onmessage = null;
      this.close = vi.fn();
      this.addEventListener = vi.fn();
      createdInstances.push(this);
      return this;
    });
    vi.stubGlobal('EventSource', MockEventSource);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    vi.unstubAllGlobals();
    vi.useRealTimers(); // In case any test used fake timers
  });

  it('loads initial data when not initialized', async () => {
    renderHook(() => useSSE());

    await waitFor(() => {
      expect(mockInitialDataGet).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockSetUsers).toHaveBeenCalledWith([{ id: 'user-1', username: 'test' }]);
      expect(mockSetCurrentUserId).toHaveBeenCalledWith('user-1');
      expect(mockSetInitialized).toHaveBeenCalledWith(true);
      expect(mockSetRounds).toHaveBeenCalledWith([{ id: 'round-1', title: 'Test Round' }]);
      expect(mockSetProphecies).toHaveBeenCalledWith([
        { id: 'prophecy-1', title: 'Test Prophecy' },
      ]);
      expect(mockSetRatings).toHaveBeenCalledWith([{ id: 'rating-1', value: 5 }]);
    });
  });

  it('skips loading initial data when already initialized', async () => {
    mockIsInitialized = true;

    const { result } = renderHook(() => useSSE());

    // Wait for state to update
    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    expect(mockInitialDataGet).not.toHaveBeenCalled();
  });

  it('creates EventSource connection after initial data is loaded', async () => {
    renderHook(() => useSSE());

    // Wait for initial data to load
    await waitFor(() => {
      expect(mockInitialDataGet).toHaveBeenCalled();
    });

    // Then EventSource should be created
    await waitFor(() => {
      expect(EventSource).toHaveBeenCalledWith('/api/sse');
    });
  });

  it('registers event listeners for all event types', async () => {
    renderHook(() => useSSE());

    // Wait for EventSource to be created
    await waitFor(() => {
      expect(EventSource).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(createdInstances.length).toBeGreaterThan(0);
    });

    const instance = createdInstances[0];
    const expectedEventTypes = [
      'round:created',
      'round:updated',
      'round:deleted',
      'user:created',
      'user:updated',
      'user:deleted',
      'prophecy:created',
      'prophecy:updated',
      'prophecy:deleted',
      'rating:created',
      'rating:updated',
      'rating:deleted',
      'badge:awarded',
      'badge:revoked',
    ];

    expectedEventTypes.forEach((type) => {
      expect(instance.addEventListener).toHaveBeenCalledWith(type, expect.any(Function));
    });
  });

  it('closes EventSource on unmount', async () => {
    const { unmount } = renderHook(() => useSSE());

    await waitFor(() => {
      expect(EventSource).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(createdInstances.length).toBeGreaterThan(0);
    });

    const instance = createdInstances[0];
    unmount();

    expect(instance.close).toHaveBeenCalled();
  });

  it('attempts to reconnect on error with exponential backoff', async () => {
    vi.useFakeTimers();

    renderHook(() => useSSE());

    // Wait for fetch to resolve and state to update
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(createdInstances.length).toBeGreaterThan(0);

    const firstInstance = createdInstances[0];

    // Trigger error
    act(() => {
      firstInstance.onerror?.();
    });

    expect(firstInstance.close).toHaveBeenCalled();

    // Fast-forward past reconnect delay
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    // Should have created a new EventSource
    expect(EventSource).toHaveBeenCalledTimes(2);
    expect(createdInstances).toHaveLength(2);
  });

  it('resets reconnect attempts on successful connection', async () => {
    renderHook(() => useSSE());

    await waitFor(() => {
      expect(createdInstances.length).toBeGreaterThan(0);
    });

    const instance = createdInstances[0];

    // Simulate successful connection
    act(() => {
      instance.onopen?.();
    });

    // Verify the instance is still active (not closed)
    expect(instance.close).not.toHaveBeenCalled();
  });

  it('handles round:created event', async () => {
    renderHook(() => useSSE());

    await waitFor(() => {
      expect(createdInstances.length).toBeGreaterThan(0);
    });

    const instance = createdInstances[0];
    const addEventListenerCalls = instance.addEventListener.mock.calls;
    const roundCreatedListener = addEventListenerCalls.find(
      (call) => (call as [string, unknown])[0] === 'round:created'
    )?.[1] as (event: { data: string }) => void;

    expect(roundCreatedListener).toBeDefined();

    const roundData = { id: 'round-1', title: 'New Round' };
    act(() => {
      roundCreatedListener({ data: JSON.stringify(roundData) });
    });

    expect(mockSetRound).toHaveBeenCalledWith(roundData);
  });

  it('handles round:updated event', async () => {
    renderHook(() => useSSE());

    await waitFor(() => {
      expect(createdInstances.length).toBeGreaterThan(0);
    });

    const instance = createdInstances[0];
    const addEventListenerCalls = instance.addEventListener.mock.calls;
    const roundUpdatedListener = addEventListenerCalls.find(
      (call) => (call as [string, unknown])[0] === 'round:updated'
    )?.[1] as (event: { data: string }) => void;

    const roundData = { id: 'round-1', title: 'Updated Round' };
    act(() => {
      roundUpdatedListener({ data: JSON.stringify(roundData) });
    });

    expect(mockSetRound).toHaveBeenCalledWith(roundData);
  });

  it('handles round:deleted event', async () => {
    renderHook(() => useSSE());

    await waitFor(() => {
      expect(createdInstances.length).toBeGreaterThan(0);
    });

    const instance = createdInstances[0];
    const addEventListenerCalls = instance.addEventListener.mock.calls;
    const roundDeletedListener = addEventListenerCalls.find(
      (call) => (call as [string, unknown])[0] === 'round:deleted'
    )?.[1] as (event: { data: string }) => void;

    act(() => {
      roundDeletedListener({ data: JSON.stringify({ id: 'round-1' }) });
    });

    expect(mockRemoveRound).toHaveBeenCalledWith('round-1');
  });

  it('handles user:created event', async () => {
    renderHook(() => useSSE());

    await waitFor(() => {
      expect(createdInstances.length).toBeGreaterThan(0);
    });

    const instance = createdInstances[0];
    const addEventListenerCalls = instance.addEventListener.mock.calls;
    const userCreatedListener = addEventListenerCalls.find(
      (call) => (call as [string, unknown])[0] === 'user:created'
    )?.[1] as (event: { data: string }) => void;

    const userData = { id: 'user-1', username: 'testuser' };
    act(() => {
      userCreatedListener({ data: JSON.stringify(userData) });
    });

    expect(mockSetUser).toHaveBeenCalledWith(userData);
  });

  it('handles user:updated event', async () => {
    renderHook(() => useSSE());

    await waitFor(() => {
      expect(createdInstances.length).toBeGreaterThan(0);
    });

    const instance = createdInstances[0];
    const addEventListenerCalls = instance.addEventListener.mock.calls;
    const userUpdatedListener = addEventListenerCalls.find(
      (call) => (call as [string, unknown])[0] === 'user:updated'
    )?.[1] as (event: { data: string }) => void;

    const userData = { id: 'user-1', username: 'testuser', avatarUrl: '/new-avatar.webp' };
    act(() => {
      userUpdatedListener({ data: JSON.stringify(userData) });
    });

    expect(mockSetUser).toHaveBeenCalledWith(userData);
  });

  it('handles user:deleted event', async () => {
    renderHook(() => useSSE());

    await waitFor(() => {
      expect(createdInstances.length).toBeGreaterThan(0);
    });

    const instance = createdInstances[0];
    const addEventListenerCalls = instance.addEventListener.mock.calls;
    const userDeletedListener = addEventListenerCalls.find(
      (call) => (call as [string, unknown])[0] === 'user:deleted'
    )?.[1] as (event: { data: string }) => void;

    act(() => {
      userDeletedListener({ data: JSON.stringify({ id: 'user-1' }) });
    });

    expect(mockRemoveUser).toHaveBeenCalledWith('user-1');
  });

  it('handles prophecy:created event', async () => {
    renderHook(() => useSSE());

    await waitFor(() => {
      expect(createdInstances.length).toBeGreaterThan(0);
    });

    const instance = createdInstances[0];
    const addEventListenerCalls = instance.addEventListener.mock.calls;
    const prophecyCreatedListener = addEventListenerCalls.find(
      (call) => (call as [string, unknown])[0] === 'prophecy:created'
    )?.[1] as (event: { data: string }) => void;

    const prophecyData = { id: 'prophecy-1', title: 'New Prophecy' };
    act(() => {
      prophecyCreatedListener({ data: JSON.stringify(prophecyData) });
    });

    expect(mockSetProphecy).toHaveBeenCalledWith(prophecyData);
  });

  it('handles prophecy:updated event', async () => {
    renderHook(() => useSSE());

    await waitFor(() => {
      expect(createdInstances.length).toBeGreaterThan(0);
    });

    const instance = createdInstances[0];
    const addEventListenerCalls = instance.addEventListener.mock.calls;
    const prophecyUpdatedListener = addEventListenerCalls.find(
      (call) => (call as [string, unknown])[0] === 'prophecy:updated'
    )?.[1] as (event: { data: string }) => void;

    const prophecyData = { id: 'prophecy-1', title: 'Updated Prophecy' };
    act(() => {
      prophecyUpdatedListener({ data: JSON.stringify(prophecyData) });
    });

    expect(mockSetProphecy).toHaveBeenCalledWith(prophecyData);
  });

  it('handles prophecy:deleted event', async () => {
    renderHook(() => useSSE());

    await waitFor(() => {
      expect(createdInstances.length).toBeGreaterThan(0);
    });

    const instance = createdInstances[0];
    const addEventListenerCalls = instance.addEventListener.mock.calls;
    const prophecyDeletedListener = addEventListenerCalls.find(
      (call) => (call as [string, unknown])[0] === 'prophecy:deleted'
    )?.[1] as (event: { data: string }) => void;

    act(() => {
      prophecyDeletedListener({ data: JSON.stringify({ id: 'prophecy-1' }) });
    });

    expect(mockRemoveProphecy).toHaveBeenCalledWith('prophecy-1');
  });

  it('handles rating:created event', async () => {
    renderHook(() => useSSE());

    await waitFor(() => {
      expect(createdInstances.length).toBeGreaterThan(0);
    });

    const instance = createdInstances[0];
    const addEventListenerCalls = instance.addEventListener.mock.calls;
    const ratingCreatedListener = addEventListenerCalls.find(
      (call) => (call as [string, unknown])[0] === 'rating:created'
    )?.[1] as (event: { data: string }) => void;

    const ratingData = { id: 'rating-1', value: 8, prophecyId: 'prophecy-1', userId: 'user-1' };
    act(() => {
      ratingCreatedListener({ data: JSON.stringify(ratingData) });
    });

    expect(mockSetRating).toHaveBeenCalledWith(ratingData);
  });

  it('handles rating:updated event', async () => {
    renderHook(() => useSSE());

    await waitFor(() => {
      expect(createdInstances.length).toBeGreaterThan(0);
    });

    const instance = createdInstances[0];
    const addEventListenerCalls = instance.addEventListener.mock.calls;
    const ratingUpdatedListener = addEventListenerCalls.find(
      (call) => (call as [string, unknown])[0] === 'rating:updated'
    )?.[1] as (event: { data: string }) => void;

    const ratingData = { id: 'rating-1', value: 9, prophecyId: 'prophecy-1', userId: 'user-1' };
    act(() => {
      ratingUpdatedListener({ data: JSON.stringify(ratingData) });
    });

    expect(mockSetRating).toHaveBeenCalledWith(ratingData);
  });

  it('handles rating:deleted event', async () => {
    renderHook(() => useSSE());

    await waitFor(() => {
      expect(createdInstances.length).toBeGreaterThan(0);
    });

    const instance = createdInstances[0];
    const addEventListenerCalls = instance.addEventListener.mock.calls;
    const ratingDeletedListener = addEventListenerCalls.find(
      (call) => (call as [string, unknown])[0] === 'rating:deleted'
    )?.[1] as (event: { data: string }) => void;

    act(() => {
      ratingDeletedListener({ data: JSON.stringify({ id: 'rating-1' }) });
    });

    expect(mockRemoveRating).toHaveBeenCalledWith('rating-1');
  });

  it('handles JSON parse errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderHook(() => useSSE());

    await waitFor(() => {
      expect(createdInstances.length).toBeGreaterThan(0);
    });

    const instance = createdInstances[0];
    const addEventListenerCalls = instance.addEventListener.mock.calls;
    const roundCreatedListener = addEventListenerCalls.find(
      (call) => (call as [string, unknown])[0] === 'round:created'
    )?.[1] as (event: { data: string }) => void;

    // Simulate receiving invalid JSON
    act(() => {
      roundCreatedListener({ data: 'invalid json' });
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('closes existing connection before creating new one on reconnect', async () => {
    vi.useFakeTimers();

    renderHook(() => useSSE());

    // Wait for fetch to resolve and state to update
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(createdInstances.length).toBeGreaterThan(0);

    const firstInstance = createdInstances[0];

    // Trigger error to initiate reconnect
    act(() => {
      firstInstance.onerror?.();
    });

    // First instance should be closed
    expect(firstInstance.close).toHaveBeenCalled();

    // Fast-forward past reconnect delay
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    // Second instance should be created
    expect(createdInstances).toHaveLength(2);
  });

  it('clears reconnect timeout on unmount', async () => {
    vi.useFakeTimers();

    const { unmount } = renderHook(() => useSSE());

    // Wait for fetch to resolve and state to update
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(createdInstances.length).toBeGreaterThan(0);

    const firstInstance = createdInstances[0];

    // Trigger error to start reconnect timer
    act(() => {
      firstInstance.onerror?.();
    });

    // Unmount before timeout fires
    unmount();

    // Advance timers - should not create new connection
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    // Should still only have 1 instance (initial)
    expect(createdInstances).toHaveLength(1);
  });

  it('handles fetch error gracefully during initial data load', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockInitialDataGet.mockRejectedValue(new Error('Network error'));

    renderHook(() => useSSE());

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SSE] Error loading initial data:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it('handles non-ok fetch response during initial data load', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockInitialDataGet.mockResolvedValue({
      data: null,
      error: { error: 'Server error' },
    });

    renderHook(() => useSSE());

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SSE] Error loading initial data:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it('uses exponential backoff with max delay on multiple reconnect attempts', async () => {
    vi.useFakeTimers();

    renderHook(() => useSSE());

    // Wait for fetch to resolve and state to update
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(createdInstances.length).toBeGreaterThan(0);

    // First error - 1000ms delay
    act(() => {
      createdInstances[0].onerror?.();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(createdInstances).toHaveLength(2);

    // Second error - 2000ms delay
    act(() => {
      createdInstances[1].onerror?.();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(createdInstances).toHaveLength(3);

    // Third error - 4000ms delay
    act(() => {
      createdInstances[2].onerror?.();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    expect(createdInstances).toHaveLength(4);
  });

  describe('connectionStatus', () => {
    it('returns connectionStatus from hook', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useSSE());

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(result.current.connectionStatus).toBeDefined();
    });

    it('sets status to connected on open', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useSSE());

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      act(() => {
        createdInstances[0].onopen?.();
      });

      expect(result.current.connectionStatus).toBe('connected');
    });

    it('sets status to disconnected on error', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useSSE());

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      act(() => {
        createdInstances[0].onopen?.();
      });

      expect(result.current.connectionStatus).toBe('connected');

      act(() => {
        createdInstances[0].onerror?.();
      });

      expect(result.current.connectionStatus).toBe('disconnected');
    });
  });

  describe('heartbeat timeout', () => {
    it('sets status to disconnected after 45s without messages', async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useSSE());

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      act(() => {
        createdInstances[0].onopen?.();
      });

      expect(result.current.connectionStatus).toBe('connected');

      // Advance time by 45 seconds (heartbeat timeout)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(45000);
      });

      expect(result.current.connectionStatus).toBe('disconnected');
    });

    it('resets heartbeat timeout on message received', async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useSSE());

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      act(() => {
        createdInstances[0].onopen?.();
      });

      // Advance 30 seconds
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000);
      });

      // Simulate message received (resets timeout)
      act(() => {
        createdInstances[0].onmessage?.();
      });

      // Advance another 30 seconds (total 60s, but timeout reset at 30s)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000);
      });

      // Should still be connected (timeout was reset)
      expect(result.current.connectionStatus).toBe('connected');
    });
  });

  describe('reconnect data reload', () => {
    it('reloads data after reconnect', async () => {
      vi.useFakeTimers();

      // Clear previous calls
      mockInitialDataGet.mockClear();

      renderHook(() => useSSE());

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // Verify initial data was loaded
      expect(mockInitialDataGet).toHaveBeenCalledTimes(1);

      // Initial connect
      await act(async () => {
        createdInstances[0].onopen?.();
      });

      // Simulate disconnect
      await act(async () => {
        createdInstances[0].onerror?.();
      });

      // Wait for reconnect delay
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      const callCountBeforeReconnect = mockInitialDataGet.mock.calls.length;

      // Simulate successful reconnect - this triggers async data reload
      await act(async () => {
        createdInstances[1].onopen?.();
      });

      // Verify data was reloaded after reconnect
      expect(mockInitialDataGet.mock.calls.length).toBeGreaterThan(callCountBeforeReconnect);
    });

    it('reloads data after heartbeat timeout', async () => {
      vi.useFakeTimers();

      // Clear previous calls
      mockInitialDataGet.mockClear();

      renderHook(() => useSSE());

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // Verify initial data was loaded
      expect(mockInitialDataGet).toHaveBeenCalledTimes(1);

      // Initial connect
      act(() => {
        createdInstances[0].onopen?.();
      });

      // Wait for heartbeat timeout (45s)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(45000);
      });

      // Heartbeat timeout should trigger data reload
      expect(mockInitialDataGet).toHaveBeenCalledTimes(2);
    });
  });

  describe('badge events', () => {
    it('handles badge:awarded event for current user', async () => {
      renderHook(() => useSSE());

      await waitFor(() => {
        expect(createdInstances.length).toBeGreaterThan(0);
      });

      const instance = createdInstances[0];
      const addEventListenerCalls = instance.addEventListener.mock.calls;
      const badgeAwardedListener = addEventListenerCalls.find(
        (call) => (call as [string, unknown])[0] === 'badge:awarded'
      )?.[1] as (event: { data: string }) => void;

      expect(badgeAwardedListener).toBeDefined();

      const badgeData = {
        id: 'ub-1',
        userId: 'user-1',
        badgeId: 'badge-1',
        earnedAt: '2025-01-15T00:00:00.000Z',
        badge: { id: 'badge-1', key: 'creator_1', name: 'Test Badge' },
      };
      act(() => {
        badgeAwardedListener({ data: JSON.stringify(badgeData) });
      });

      expect(mockAddMyBadge).toHaveBeenCalledWith(badgeData);
      expect(mockAddUserBadge).toHaveBeenCalledWith({
        userId: 'user-1',
        badgeId: 'badge-1',
        earnedAt: '2025-01-15T00:00:00.000Z',
      });
    });

    it('handles badge:awarded event for other user (not current user)', async () => {
      renderHook(() => useSSE());

      await waitFor(() => {
        expect(createdInstances.length).toBeGreaterThan(0);
      });

      const instance = createdInstances[0];
      const addEventListenerCalls = instance.addEventListener.mock.calls;
      const badgeAwardedListener = addEventListenerCalls.find(
        (call) => (call as [string, unknown])[0] === 'badge:awarded'
      )?.[1] as (event: { data: string }) => void;

      const badgeData = {
        id: 'ub-1',
        userId: 'other-user',
        badgeId: 'badge-1',
        earnedAt: '2025-01-15T00:00:00.000Z',
        badge: { id: 'badge-1', key: 'creator_1', name: 'Test Badge' },
      };
      act(() => {
        badgeAwardedListener({ data: JSON.stringify(badgeData) });
      });

      // Should not add to my badges (different user)
      expect(mockAddMyBadge).not.toHaveBeenCalled();
      // But should still add to allUserBadges
      expect(mockAddUserBadge).toHaveBeenCalledWith({
        userId: 'other-user',
        badgeId: 'badge-1',
        earnedAt: '2025-01-15T00:00:00.000Z',
      });
    });

    it('handles badge:revoked event for current user', async () => {
      renderHook(() => useSSE());

      await waitFor(() => {
        expect(createdInstances.length).toBeGreaterThan(0);
      });

      const instance = createdInstances[0];
      const addEventListenerCalls = instance.addEventListener.mock.calls;
      const badgeRevokedListener = addEventListenerCalls.find(
        (call) => (call as [string, unknown])[0] === 'badge:revoked'
      )?.[1] as (event: { data: string }) => void;

      expect(badgeRevokedListener).toBeDefined();

      const revokeData = {
        userId: 'user-1',
        badgeId: 'badge-1',
      };
      act(() => {
        badgeRevokedListener({ data: JSON.stringify(revokeData) });
      });

      expect(mockRemoveMyBadge).toHaveBeenCalledWith('badge-1');
      expect(mockRemoveUserBadge).toHaveBeenCalledWith('user-1', 'badge-1');
    });

    it('handles badge:revoked event for other user (not current user)', async () => {
      renderHook(() => useSSE());

      await waitFor(() => {
        expect(createdInstances.length).toBeGreaterThan(0);
      });

      const instance = createdInstances[0];
      const addEventListenerCalls = instance.addEventListener.mock.calls;
      const badgeRevokedListener = addEventListenerCalls.find(
        (call) => (call as [string, unknown])[0] === 'badge:revoked'
      )?.[1] as (event: { data: string }) => void;

      const revokeData = {
        userId: 'other-user',
        badgeId: 'badge-1',
      };
      act(() => {
        badgeRevokedListener({ data: JSON.stringify(revokeData) });
      });

      // Should not remove from my badges (different user)
      expect(mockRemoveMyBadge).not.toHaveBeenCalled();
      // But should still remove from allUserBadges
      expect(mockRemoveUserBadge).toHaveBeenCalledWith('other-user', 'badge-1');
    });
  });
});
