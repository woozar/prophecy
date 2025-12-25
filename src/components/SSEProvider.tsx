'use client';

import { useSSE } from '@/hooks/useSSE';

export function SSEProvider() {
  useSSE();
  return null;
}
