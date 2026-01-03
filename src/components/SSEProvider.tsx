'use client';

import { memo, useEffect } from 'react';

import { useSSE } from '@/hooks/useSSE';
import { useSSEToasts } from '@/hooks/useSSEToasts';
import { useUserStore } from '@/store/useUserStore';

interface SSEProviderProps {
  userId: string;
}

export const SSEProvider = memo(function SSEProvider({ userId }: Readonly<SSEProviderProps>) {
  // Get toast notification handlers for SSE events
  const sseToastCallbacks = useSSEToasts();

  // Pass callbacks to useSSE to trigger toasts on events
  const { connectionStatus } = useSSE(sseToastCallbacks);

  // Setze currentUserId und connectionStatus bei jedem Render
  useEffect(() => {
    useUserStore.getState().setCurrentUserId(userId);
  }, [userId]);

  useEffect(() => {
    useUserStore.getState().setConnectionStatus(connectionStatus);
  }, [connectionStatus]);

  return null;
});
