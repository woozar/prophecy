"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRoundStore, type Round } from "@/store/useRoundStore";
import { useUserStore } from "@/store/useUserStore";

type SSEEventType =
  | "round:created"
  | "round:updated"
  | "round:deleted"
  | "user:created"
  | "user:updated"
  | "user:deleted"
  | "prophecy:created"
  | "prophecy:updated"
  | "prophecy:deleted"
  | "rating:created"
  | "rating:updated";

export function useSSE() {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const connectRef = useRef<() => void>(() => {});

  // Zustand store actions
  const { addRound, updateRound, deleteRound } = useRoundStore();

  const handleEvent = useCallback(
    (type: SSEEventType, data: unknown) => {
      switch (type) {
        case "round:created":
          addRound(data as Round);
          break;
        case "round:updated":
          updateRound(data as Round);
          break;
        case "round:deleted":
          deleteRound((data as { id: string }).id);
          break;
        case "user:updated":
        case "user:created":
        case "user:deleted":
          useUserStore.getState().fetchUsers();
          break;
        default:
          console.log(`[SSE] Unhandled event: ${type}`, data);
      }
    },
    [addRound, updateRound, deleteRound]
  );

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource("/api/sse");
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log("[SSE] Connected");
      reconnectAttempts.current = 0;
    };

    eventSource.onerror = () => {
      console.log("[SSE] Connection error, attempting reconnect...");
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
      "round:created",
      "round:updated",
      "round:deleted",
      "user:created",
      "user:updated",
      "user:deleted",
      "prophecy:created",
      "prophecy:updated",
      "prophecy:deleted",
      "rating:created",
      "rating:updated",
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

  useEffect(() => {
    // Connect on mount - SSE endpoint handles auth
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
  }, [connect]);
}
