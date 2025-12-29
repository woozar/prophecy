'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { type Prophecy, useProphecyStore } from '@/store/useProphecyStore';
import { type Rating, useRatingStore } from '@/store/useRatingStore';
import { type Round, useRoundStore } from '@/store/useRoundStore';
import { type User, useUserStore } from '@/store/useUserStore';

type SSEEventType =
  | 'round:created'
  | 'round:updated'
  | 'round:deleted'
  | 'user:created'
  | 'user:updated'
  | 'user:deleted'
  | 'prophecy:created'
  | 'prophecy:updated'
  | 'prophecy:deleted'
  | 'rating:created'
  | 'rating:updated'
  | 'rating:deleted';

export function useSSE() {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const connectRef = useRef<() => void>(() => {});
  const [isInitialized, setIsInitialized] = useState(false);

  // Store actions
  const { setRound, removeRound } = useRoundStore();
  const { setUser, removeUser } = useUserStore();
  const { setProphecy, removeProphecy } = useProphecyStore();
  const { setRating, removeRating } = useRatingStore();

  // Load initial data
  useEffect(() => {
    // Skip if already initialized (e.g., after client-side navigation)
    if (useUserStore.getState().isInitialized) {
      setIsInitialized(true);
      return;
    }

    async function loadInitialData() {
      try {
        const res = await fetch('/api/initial-data');
        if (!res.ok) throw new Error('Failed to load initial data');

        const data = await res.json();

        // Populate stores
        useUserStore.getState().setUsers(data.users);
        useUserStore.getState().setCurrentUserId(data.currentUserId);
        useUserStore.getState().setInitialized(true);
        useRoundStore.getState().setRounds(data.rounds);
        useProphecyStore.getState().setProphecies(data.prophecies);
        useRatingStore.getState().setRatings(data.ratings);

        setIsInitialized(true);
      } catch (error) {
        console.error('[SSE] Error loading initial data:', error);
      }
    }

    loadInitialData();
  }, []);

  const handleEvent = useCallback(
    (type: SSEEventType, data: unknown) => {
      switch (type) {
        // Round events
        case 'round:created':
        case 'round:updated':
          setRound(data as Round);
          break;
        case 'round:deleted':
          removeRound((data as { id: string }).id);
          break;

        // User events
        case 'user:created':
        case 'user:updated':
          setUser(data as User);
          break;
        case 'user:deleted':
          removeUser((data as { id: string }).id);
          break;

        // Prophecy events
        case 'prophecy:created':
        case 'prophecy:updated':
          setProphecy(data as Prophecy);
          break;
        case 'prophecy:deleted':
          removeProphecy((data as { id: string }).id);
          break;

        // Rating events
        case 'rating:created':
        case 'rating:updated':
          setRating(data as Rating);
          break;
        case 'rating:deleted':
          removeRating((data as { id: string }).id);
          break;

        default:
          console.log(`[SSE] Unhandled event: ${type}`, data);
      }
    },
    [
      setRound,
      removeRound,
      setUser,
      removeUser,
      setProphecy,
      removeProphecy,
      setRating,
      removeRating,
    ]
  );

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource('/api/sse');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[SSE] Connected');
      reconnectAttempts.current = 0;
    };

    eventSource.onerror = () => {
      console.log('[SSE] Connection error, attempting reconnect...');
      eventSource.close();
      eventSourceRef.current = null;

      // Exponential backoff for reconnection
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectAttempts.current++;

      reconnectTimeoutRef.current = setTimeout(() => {
        connectRef.current();
      }, delay);
    };

    // Listen for all event types
    const eventTypes: SSEEventType[] = [
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
    ];

    eventTypes.forEach((type) => {
      eventSource.addEventListener(type, (event) => {
        try {
          const data = JSON.parse(event.data);
          handleEvent(type, data);
        } catch (error) {
          console.error(`[SSE] Error parsing ${type} event:`, error);
        }
      });
    });
  }, [handleEvent]);

  // Keep connectRef updated
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Connect to SSE after initial data is loaded
  useEffect(() => {
    if (!isInitialized) return;

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect, isInitialized]);

  return { isInitialized };
}
