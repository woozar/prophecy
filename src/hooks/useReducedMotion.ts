'use client';

import { useSyncExternalStore } from 'react';

import { selectCurrentUser, useUserStore } from '@/store/useUserStore';

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
 * Hook to detect if animations should be reduced.
 * Returns true if:
 * - OS prefers reduced motion (via prefers-reduced-motion media query), OR
 * - User has disabled animations in their settings (animationsEnabled === false)
 */
export function useReducedMotion(): boolean {
  const osReducedMotion = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const currentUser = useUserStore(selectCurrentUser);

  // Reduce motion if OS preference is set OR if user has explicitly disabled animations
  // Note: animationsEnabled defaults to true in the database, so undefined means enabled
  const userDisabledAnimations = currentUser?.animationsEnabled === false;

  return osReducedMotion || userDisabledAnimations;
}
