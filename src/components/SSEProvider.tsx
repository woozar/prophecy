'use client';

import { useEffect } from 'react';

import { useSSE } from '@/hooks/useSSE';
import { useUserStore } from '@/store/useUserStore';

interface SSEProviderProps {
  userId: string;
}

export function SSEProvider({ userId }: Readonly<SSEProviderProps>) {
  useSSE();

  // Setze currentUserId bei jedem Render (Login/Userwechsel)
  useEffect(() => {
    useUserStore.getState().setCurrentUserId(userId);
  }, [userId]);

  return null;
}
