'use client';

import { memo, useEffect } from 'react';

import { useSSE } from '@/hooks/useSSE';
import { useUserStore } from '@/store/useUserStore';

interface SSEProviderProps {
  userId: string;
}

export const SSEProvider = memo(function SSEProvider({ userId }: Readonly<SSEProviderProps>) {
  const { connectionStatus } = useSSE();

  // Setze currentUserId und connectionStatus bei jedem Render
  useEffect(() => {
    useUserStore.getState().setCurrentUserId(userId);
  }, [userId]);

  useEffect(() => {
    useUserStore.getState().setConnectionStatus(connectionStatus);
  }, [connectionStatus]);

  return null;
});
