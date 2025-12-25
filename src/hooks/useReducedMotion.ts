'use client';

import { useSyncExternalStore } from 'react';

const MEDIA_QUERY = '(prefers-reduced-motion: reduce)';

function getSnapshot(): boolean {
  return globalThis.matchMedia(MEDIA_QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

function subscribe(callback: () => void): () => void {
  const mediaQuery = globalThis.matchMedia(MEDIA_QUERY);
  mediaQuery.addEventListener('change', callback);
  return () => mediaQuery.removeEventListener('change', callback);
}

/**
 * Hook to detect OS preference for reduced motion.
 * Returns true if user prefers reduced motion.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
