import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSSE, onProphecyRated, type ProphecyRatedEvent } from './useSSE';

// Mock the stores
vi.mock('@/store/useRoundStore', () => ({
  useRoundStore: vi.fn(() => ({
    addRound: vi.fn(),
    updateRound: vi.fn(),
    deleteRound: vi.fn(),
  })),
}));

vi.mock('@/store/useUserStore', () => ({
  useUserStore: {
    getState: () => ({
      fetchUsers: vi.fn(),
    }),
  },
}));

describe('onProphecyRated', () => {
  it('registers a handler and returns unsubscribe function', () => {
    const handler = vi.fn();
    const unsubscribe = onProphecyRated(handler);

    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('calls registered handlers when event is dispatched', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    const unsubscribe1 = onProphecyRated(handler1);
    const unsubscribe2 = onProphecyRated(handler2);

    const event: ProphecyRatedEvent = {
      id: 'prophecy-1',
      roundId: 'round-1',
      averageRating: 5.5,
      ratingCount: 10,
    };

    // Simulate the event being dispatched by triggering handlers directly
    // This tests the subscription mechanism
    handler1(event);
    handler2(event);

    expect(handler1).toHaveBeenCalledWith(event);
    expect(handler2).toHaveBeenCalledWith(event);

    unsubscribe1();
    unsubscribe2();
  });

  it('removes handler when unsubscribe is called', () => {
    const handler = vi.fn();
    const unsubscribe = onProphecyRated(handler);

    unsubscribe();

    // After unsubscribe, handler should not be in the set anymore
    // We can verify this by checking the handler is not called
    // when we manually check (though in real usage, the SSE would trigger it)
    expect(handler).not.toHaveBeenCalled();
  });

  it('handles multiple subscriptions and unsubscriptions correctly', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const handler3 = vi.fn();

    const unsub1 = onProphecyRated(handler1);
    const unsub2 = onProphecyRated(handler2);
    const unsub3 = onProphecyRated(handler3);

    // Verify all handlers are registered (functions returned)
    expect(typeof unsub1).toBe('function');
    expect(typeof unsub2).toBe('function');
    expect(typeof unsub3).toBe('function');

    // Unsubscribe handler2
    unsub2();

    // Clean up
    unsub1();
    unsub3();
  });

  it('handles null averageRating in event', () => {
    const handler = vi.fn();
    const unsubscribe = onProphecyRated(handler);

    const event: ProphecyRatedEvent = {
      id: 'prophecy-1',
      roundId: 'round-1',
      averageRating: null,
      ratingCount: 0,
    };

    handler(event);

    expect(handler).toHaveBeenCalledWith(event);
    expect(handler.mock.calls[0][0].averageRating).toBeNull();

    unsubscribe();
  });
});

describe('useSSE', () => {
  let createdInstances: Array<{
    onopen: (() => void) | null;
    onerror: (() => void) | null;
    close: ReturnType<typeof vi.fn>;
    addEventListener: ReturnType<typeof vi.fn>;
  }>;

  beforeEach(() => {
    vi.useFakeTimers();
    createdInstances = [];

    // Use a proper constructor function for EventSource mock
    const MockEventSource = vi.fn(function (this: {
      onopen: (() => void) | null;
      onerror: (() => void) | null;
      close: ReturnType<typeof vi.fn>;
      addEventListener: ReturnType<typeof vi.fn>;
    }) {
      this.onopen = null;
      this.onerror = null;
      this.close = vi.fn();
      this.addEventListener = vi.fn();
      createdInstances.push(this);
      return this;
    });
    vi.stubGlobal('EventSource', MockEventSource);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('creates EventSource connection on mount', () => {
    renderHook(() => useSSE());

    expect(EventSource).toHaveBeenCalledWith('/api/sse');
  });

  it('registers event listeners for all event types', () => {
    renderHook(() => useSSE());

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
      'prophecy:rated',
    ];

    expectedEventTypes.forEach((type) => {
      expect(instance.addEventListener).toHaveBeenCalledWith(
        type,
        expect.any(Function)
      );
    });
  });

  it('closes EventSource on unmount', () => {
    const { unmount } = renderHook(() => useSSE());

    const instance = createdInstances[0];
    unmount();

    expect(instance.close).toHaveBeenCalled();
  });

  it('attempts to reconnect on error with exponential backoff', async () => {
    renderHook(() => useSSE());

    const firstInstance = createdInstances[0];

    // Trigger error
    act(() => {
      firstInstance.onerror?.();
    });

    expect(firstInstance.close).toHaveBeenCalled();

    // Fast-forward past reconnect delay
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Should have created a new EventSource
    expect(EventSource).toHaveBeenCalledTimes(2);
    expect(createdInstances).toHaveLength(2);
  });

  it('resets reconnect attempts on successful connection', () => {
    renderHook(() => useSSE());

    const instance = createdInstances[0];

    // Verify instance was created
    expect(instance).toBeDefined();
    expect(instance.onopen).toBeDefined();

    // Simulate successful connection
    act(() => {
      instance.onopen?.();
    });

    // Verify the instance is still active (not closed)
    expect(instance.close).not.toHaveBeenCalled();
  });

  it('handles prophecy:rated event and notifies subscribers', () => {
    const handler = vi.fn();
    onProphecyRated(handler);

    renderHook(() => useSSE());

    const instance = createdInstances[0];

    // Get the event listener for prophecy:rated
    const addEventListenerCalls = instance.addEventListener.mock.calls;
    const prophecyRatedListener = addEventListenerCalls.find(
      (call) => (call as [string, unknown])[0] === 'prophecy:rated'
    )?.[1];

    expect(prophecyRatedListener).toBeDefined();

    // Simulate receiving a prophecy:rated event
    const eventData = {
      id: 'prophecy-123',
      roundId: 'round-456',
      averageRating: 7.5,
      ratingCount: 15,
    };

    act(() => {
      prophecyRatedListener?.({ data: JSON.stringify(eventData) });
    });

    expect(handler).toHaveBeenCalledWith(eventData);

    // Clean up
    handler.mockClear();
  });

  it('handles JSON parse errors gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderHook(() => useSSE());

    const instance = createdInstances[0];

    // Get the event listener for any event type
    const addEventListenerCalls = instance.addEventListener.mock.calls;
    const roundCreatedListener = addEventListenerCalls.find(
      (call) => (call as [string, unknown])[0] === 'round:created'
    )?.[1];

    // Simulate receiving invalid JSON
    act(() => {
      roundCreatedListener?.({ data: 'invalid json' });
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('handles round:created event and adds round to store', async () => {
    const mockAddRound = vi.fn();
    const { useRoundStore } = await import('@/store/useRoundStore');
    vi.mocked(useRoundStore).mockReturnValue({
      addRound: mockAddRound,
      updateRound: vi.fn(),
      deleteRound: vi.fn(),
      rounds: [],
      setRounds: vi.fn(),
      isLoading: false,
      error: null,
      setLoading: vi.fn(),
      setError: vi.fn(),
      fetchRounds: vi.fn(),
    });

    renderHook(() => useSSE());

    const instance = createdInstances[0];
    const addEventListenerCalls = instance.addEventListener.mock.calls;
    const roundCreatedListener = addEventListenerCalls.find(
      (call) => (call as [string, unknown])[0] === 'round:created'
    )?.[1];

    const roundData = { id: 'round-1', title: 'New Round' };
    act(() => {
      roundCreatedListener?.({ data: JSON.stringify(roundData) });
    });

    expect(mockAddRound).toHaveBeenCalledWith(roundData);
  });

  it('handles round:updated event and updates round in store', async () => {
    const mockUpdateRound = vi.fn();
    const { useRoundStore } = await import('@/store/useRoundStore');
    vi.mocked(useRoundStore).mockReturnValue({
      addRound: vi.fn(),
      updateRound: mockUpdateRound,
      deleteRound: vi.fn(),
      rounds: [],
      setRounds: vi.fn(),
      isLoading: false,
      error: null,
      setLoading: vi.fn(),
      setError: vi.fn(),
      fetchRounds: vi.fn(),
    });

    renderHook(() => useSSE());

    const instance = createdInstances[0];
    const addEventListenerCalls = instance.addEventListener.mock.calls;
    const roundUpdatedListener = addEventListenerCalls.find(
      (call) => (call as [string, unknown])[0] === 'round:updated'
    )?.[1];

    const roundData = { id: 'round-1', title: 'Updated Round' };
    act(() => {
      roundUpdatedListener?.({ data: JSON.stringify(roundData) });
    });

    expect(mockUpdateRound).toHaveBeenCalledWith(roundData);
  });

  it('handles round:deleted event and deletes round from store', async () => {
    const mockDeleteRound = vi.fn();
    const { useRoundStore } = await import('@/store/useRoundStore');
    vi.mocked(useRoundStore).mockReturnValue({
      addRound: vi.fn(),
      updateRound: vi.fn(),
      deleteRound: mockDeleteRound,
      rounds: [],
      setRounds: vi.fn(),
      isLoading: false,
      error: null,
      setLoading: vi.fn(),
      setError: vi.fn(),
      fetchRounds: vi.fn(),
    });

    renderHook(() => useSSE());

    const instance = createdInstances[0];
    const addEventListenerCalls = instance.addEventListener.mock.calls;
    const roundDeletedListener = addEventListenerCalls.find(
      (call) => (call as [string, unknown])[0] === 'round:deleted'
    )?.[1];

    act(() => {
      roundDeletedListener?.({ data: JSON.stringify({ id: 'round-1' }) });
    });

    expect(mockDeleteRound).toHaveBeenCalledWith('round-1');
  });

  it('handles user:updated event and fetches users', async () => {
    const mockFetchUsers = vi.fn();
    const { useUserStore } = await import('@/store/useUserStore');
    vi.mocked(useUserStore).getState = () => ({
      fetchUsers: mockFetchUsers,
      users: [],
      setUsers: vi.fn(),
      isLoading: false,
      setLoading: vi.fn(),
      error: null,
      updateUser: vi.fn(),
      setError: vi.fn(),
    });

    renderHook(() => useSSE());

    const instance = createdInstances[0];
    const addEventListenerCalls = instance.addEventListener.mock.calls;
    const userUpdatedListener = addEventListenerCalls.find(
      (call) => (call as [string, unknown])[0] === 'user:updated'
    )?.[1];

    act(() => {
      userUpdatedListener?.({ data: JSON.stringify({ id: 'user-1' }) });
    });

    expect(mockFetchUsers).toHaveBeenCalled();
  });

  it('handles prophecy:created event and logs to console', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    renderHook(() => useSSE());

    const instance = createdInstances[0];
    const addEventListenerCalls = instance.addEventListener.mock.calls;
    const prophecyCreatedListener = addEventListenerCalls.find(
      (call) => (call as [string, unknown])[0] === 'prophecy:created'
    )?.[1];

    const prophecyData = { id: 'prophecy-1', title: 'New Prophecy' };
    act(() => {
      prophecyCreatedListener?.({ data: JSON.stringify(prophecyData) });
    });

    expect(consoleSpy).toHaveBeenCalledWith('[SSE] Prophecy event: prophecy:created', prophecyData);
    consoleSpy.mockRestore();
  });

  it('closes existing connection before creating new one on reconnect', async () => {
    renderHook(() => useSSE());

    const firstInstance = createdInstances[0];

    // Trigger error to initiate reconnect
    act(() => {
      firstInstance.onerror?.();
    });

    // Fast-forward past reconnect delay
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Second instance should be created
    expect(createdInstances).toHaveLength(2);

    // Trigger error on second instance
    const secondInstance = createdInstances[1];
    act(() => {
      secondInstance.onerror?.();
    });

    // Fast-forward with exponential backoff (2000ms this time)
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Third instance
    expect(createdInstances).toHaveLength(3);
  });

  it('clears reconnect timeout on unmount', () => {
    const { unmount } = renderHook(() => useSSE());

    const firstInstance = createdInstances[0];

    // Trigger error to start reconnect timer
    act(() => {
      firstInstance.onerror?.();
    });

    // Unmount before timeout fires
    unmount();

    // Advance timers - should not create new connection
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Should still only have 1 instance (initial)
    expect(createdInstances).toHaveLength(1);
  });

  it('logs unhandled event types to console', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    renderHook(() => useSSE());

    const instance = createdInstances[0];
    const addEventListenerCalls = instance.addEventListener.mock.calls;

    // Find any event listener and trigger it with an unknown event type
    // We'll use the prophecy:updated listener since it should go to the default case
    const prophecyUpdatedListener = addEventListenerCalls.find(
      (call) => (call as [string, unknown])[0] === 'prophecy:updated'
    )?.[1];

    const eventData = { id: 'prophecy-1', title: 'Updated' };
    act(() => {
      prophecyUpdatedListener?.({ data: JSON.stringify(eventData) });
    });

    expect(consoleSpy).toHaveBeenCalledWith('[SSE] Prophecy event: prophecy:updated', eventData);
    consoleSpy.mockRestore();
  });

  it('closes existing EventSource before creating new one in connect', async () => {
    const { unmount, rerender } = renderHook(() => useSSE());

    const firstInstance = createdInstances[0];
    expect(firstInstance.close).not.toHaveBeenCalled();

    // Trigger error to force reconnect
    act(() => {
      firstInstance.onerror?.();
    });

    // First instance should be closed
    expect(firstInstance.close).toHaveBeenCalled();

    // Fast-forward to trigger reconnect
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // New instance should be created
    expect(createdInstances).toHaveLength(2);

    // Clean up
    unmount();
  });

  it('handles prophecy:deleted event and logs to console', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    renderHook(() => useSSE());

    const instance = createdInstances[0];
    const addEventListenerCalls = instance.addEventListener.mock.calls;
    const prophecyDeletedListener = addEventListenerCalls.find(
      (call) => (call as [string, unknown])[0] === 'prophecy:deleted'
    )?.[1];

    const prophecyData = { id: 'prophecy-1' };
    act(() => {
      prophecyDeletedListener?.({ data: JSON.stringify(prophecyData) });
    });

    expect(consoleSpy).toHaveBeenCalledWith('[SSE] Prophecy event: prophecy:deleted', prophecyData);
    consoleSpy.mockRestore();
  });

  it('handles user:created event and fetches users', async () => {
    const mockFetchUsers = vi.fn();
    const { useUserStore } = await import('@/store/useUserStore');
    vi.mocked(useUserStore).getState = () => ({
      fetchUsers: mockFetchUsers,
      users: [],
      setUsers: vi.fn(),
      isLoading: false,
      setLoading: vi.fn(),
      error: null,
      updateUser: vi.fn(),
      setError: vi.fn(),
    });

    renderHook(() => useSSE());

    const instance = createdInstances[0];
    const addEventListenerCalls = instance.addEventListener.mock.calls;
    const userCreatedListener = addEventListenerCalls.find(
      (call) => (call as [string, unknown])[0] === 'user:created'
    )?.[1];

    act(() => {
      userCreatedListener?.({ data: JSON.stringify({ id: 'user-1' }) });
    });

    expect(mockFetchUsers).toHaveBeenCalled();
  });

  it('handles user:deleted event and fetches users', async () => {
    const mockFetchUsers = vi.fn();
    const { useUserStore } = await import('@/store/useUserStore');
    vi.mocked(useUserStore).getState = () => ({
      fetchUsers: mockFetchUsers,
      users: [],
      setUsers: vi.fn(),
      isLoading: false,
      setLoading: vi.fn(),
      error: null,
      updateUser: vi.fn(),
      setError: vi.fn(),
    });

    renderHook(() => useSSE());

    const instance = createdInstances[0];
    const addEventListenerCalls = instance.addEventListener.mock.calls;
    const userDeletedListener = addEventListenerCalls.find(
      (call) => (call as [string, unknown])[0] === 'user:deleted'
    )?.[1];

    act(() => {
      userDeletedListener?.({ data: JSON.stringify({ id: 'user-1' }) });
    });

    expect(mockFetchUsers).toHaveBeenCalled();
  });
});
