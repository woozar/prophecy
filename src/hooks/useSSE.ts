'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { apiClient } from '@/lib/api-client';
import {
  type Badge,
  type UserBadge,
  type UserBadgeSimple,
  useBadgeStore,
} from '@/store/useBadgeStore';
import { type Prophecy, useProphecyStore } from '@/store/useProphecyStore';
import { type Rating, useRatingStore } from '@/store/useRatingStore';
import { type Round, useRoundStore } from '@/store/useRoundStore';
import { type User, useUserStore } from '@/store/useUserStore';

import { type SSEEventCallbacks } from './useSSEToasts';

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
  | 'rating:deleted'
  | 'badge:awarded'
  | 'badge:revoked'
  | 'auditLog:created';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

// If no message received for 45 seconds, consider connection dead (server pings every 30s)
const HEARTBEAT_TIMEOUT = 45000;

export function useSSE(callbacks?: SSEEventCallbacks) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const connectRef = useRef<() => void>(() => {});
  const isReconnectingRef = useRef(false);
  const callbacksRef = useRef(callbacks);
  const [isInitialized, setIsInitialized] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  // Keep callbacks ref updated
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Store actions
  const { setRound, removeRound } = useRoundStore();
  const { setUser, removeUser } = useUserStore();
  const { setProphecy, removeProphecy } = useProphecyStore();
  const { setRating, removeRating } = useRatingStore();
  const { addMyBadge, removeMyBadge } = useBadgeStore();

  // Load/reload data from server
  const loadInitialData = useCallback(async () => {
    try {
      const { data, error } = await apiClient.initialData.get();
      if (error || !data) throw new Error('Failed to load initial data');

      // Populate stores
      useUserStore.getState().setUsers(data.users as User[]);
      useUserStore.getState().setCurrentUserId(data.currentUserId);
      useUserStore.getState().setInitialized(true);
      useRoundStore.getState().setRounds(data.rounds as Round[]);
      useProphecyStore.getState().setProphecies(data.prophecies as Prophecy[]);
      useRatingStore.getState().setRatings(data.ratings as Rating[]);

      // Populate badge store
      if (data.badges) {
        useBadgeStore.getState().setBadges(data.badges as Badge[]);
      }
      if (data.myBadges) {
        useBadgeStore.getState().setMyBadges(data.myBadges as UserBadge[]);
      }
      if (data.allUserBadges) {
        useBadgeStore.getState().setAllUserBadges(data.allUserBadges as UserBadgeSimple[]);
      }
      useBadgeStore.getState().setInitialized(true);

      setIsInitialized(true);
    } catch (error) {
      console.error('[SSE] Error loading initial data:', error);
    }
  }, []);

  // Load initial data on mount
  useEffect(() => {
    // Skip if already initialized (e.g., after client-side navigation)
    if (useUserStore.getState().isInitialized) {
      setIsInitialized(true);
      return;
    }

    loadInitialData();
  }, [loadInitialData]);

  const handleBadgeAwarded = useCallback(
    (data: unknown, shouldTriggerCallbacks: boolean) => {
      const userBadge = data as UserBadge;
      const currentUserId = useUserStore.getState().currentUserId;
      if (userBadge.userId === currentUserId) {
        addMyBadge(userBadge);
      }
      useBadgeStore.getState().addUserBadge({
        userId: userBadge.userId,
        badgeId: userBadge.badgeId,
        earnedAt: userBadge.earnedAt,
      });
      const user = useUserStore.getState().users[userBadge.userId];
      if (user) {
        setUser({ ...user, badgeIds: [...(user.badgeIds || []), userBadge.badgeId] });
      }
      if (shouldTriggerCallbacks) {
        callbacksRef.current?.onBadgeAwarded?.(userBadge);
      }
    },
    [addMyBadge, setUser]
  );

  const handleBadgeRevoked = useCallback(
    (data: unknown) => {
      const { userId, badgeId } = data as { userId: string; badgeId: string };
      const currentUserId = useUserStore.getState().currentUserId;
      if (userId === currentUserId) {
        removeMyBadge(badgeId);
      }
      useBadgeStore.getState().removeUserBadge(userId, badgeId);
      const user = useUserStore.getState().users[userId];
      if (user?.badgeIds) {
        setUser({ ...user, badgeIds: user.badgeIds.filter((id) => id !== badgeId) });
      }
    },
    [removeMyBadge, setUser]
  );

  const handleEvent = useCallback(
    (type: SSEEventType, data: unknown) => {
      const shouldTriggerCallbacks = !isReconnectingRef.current;

      const handlers: Record<SSEEventType, () => void> = {
        'round:created': () => {
          const round = data as Round;
          setRound(round);
          if (shouldTriggerCallbacks) callbacksRef.current?.onRoundCreated?.(round);
        },
        'round:updated': () => {
          const round = data as Round;
          const previousRound = useRoundStore.getState().rounds[round.id];
          setRound(round);
          if (shouldTriggerCallbacks) callbacksRef.current?.onRoundUpdated?.(round, previousRound);
        },
        'round:deleted': () => removeRound((data as { id: string }).id),
        'user:created': () => setUser(data as User),
        'user:updated': () => {
          const user = data as User;
          const previousUser = useUserStore.getState().users[user.id];
          setUser(user);
          if (shouldTriggerCallbacks) callbacksRef.current?.onUserUpdated?.(user, previousUser);
        },
        'user:deleted': () => removeUser((data as { id: string }).id),
        'prophecy:created': () => {
          const prophecy = data as Prophecy;
          setProphecy(prophecy);
          if (shouldTriggerCallbacks) callbacksRef.current?.onProphecyCreated?.(prophecy);
        },
        'prophecy:updated': () => setProphecy(data as Prophecy),
        'prophecy:deleted': () => removeProphecy((data as { id: string }).id),
        'rating:created': () => {
          const rating = data as Rating;
          setRating(rating);
          if (shouldTriggerCallbacks) callbacksRef.current?.onRatingCreated?.(rating);
        },
        'rating:updated': () => setRating(data as Rating),
        'rating:deleted': () => removeRating((data as { id: string }).id),
        'badge:awarded': () => handleBadgeAwarded(data, shouldTriggerCallbacks),
        'badge:revoked': () => handleBadgeRevoked(data),
        'auditLog:created': () => {
          // Handled directly by ProphecyAuditModal via EventSource
        },
      };

      const handler = handlers[type];
      if (handler) {
        handler();
      } else {
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
      handleBadgeAwarded,
      handleBadgeRevoked,
    ]
  );

  // Reset heartbeat timeout - call this on every message from server
  const resetHeartbeatTimeout = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }
    heartbeatTimeoutRef.current = setTimeout(() => {
      console.log('[SSE] Heartbeat timeout - no message received for 45s');
      setConnectionStatus('disconnected');
      // Force reconnect
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      // Mark as reconnecting to prevent toast spam during data reload
      isReconnectingRef.current = true;
      // Reload data since we might have missed events
      loadInitialData().finally(() => {
        isReconnectingRef.current = false;
      });
      reconnectAttempts.current++;
      connectRef.current();
    }, HEARTBEAT_TIMEOUT);
  }, [loadInitialData]);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }

    // Only show 'connecting' on first connect, not during reconnect attempts
    if (reconnectAttempts.current === 0) {
      setConnectionStatus('connecting');
    }
    const eventSource = new EventSource('/api/sse');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[SSE] Connected');
      setConnectionStatus('connected');
      resetHeartbeatTimeout();

      // Reload data if this is a reconnect (might have missed events)
      if (reconnectAttempts.current > 0) {
        console.log('[SSE] Reconnected, reloading data...');
        // Mark as reconnecting to prevent toast spam during data reload
        isReconnectingRef.current = true;
        loadInitialData().finally(() => {
          isReconnectingRef.current = false;
        });
      }
      reconnectAttempts.current = 0;
    };

    eventSource.onerror = () => {
      console.log('[SSE] Connection error, attempting reconnect...');
      setConnectionStatus('disconnected');
      eventSource.close();
      eventSourceRef.current = null;
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
      }

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
      'badge:awarded',
      'badge:revoked',
      'auditLog:created',
    ];

    eventTypes.forEach((type) => {
      eventSource.addEventListener(type, (event) => {
        resetHeartbeatTimeout();
        try {
          const data = JSON.parse(event.data);
          handleEvent(type, data);
        } catch (error) {
          console.error(`[SSE] Error parsing ${type} event:`, error);
        }
      });
    });

    // Also listen for any message (including pings) to reset heartbeat
    eventSource.onmessage = () => {
      resetHeartbeatTimeout();
    };
  }, [handleEvent, loadInitialData, resetHeartbeatTimeout]);

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
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
      }
    };
  }, [connect, isInitialized]);

  return { isInitialized, connectionStatus };
}
