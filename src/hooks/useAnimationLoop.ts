'use client';

import { useEffect, useState } from 'react';

/**
 * Hook for animation loops that update currentTime at a given interval
 * @param intervalMs - Interval in milliseconds between updates
 * @returns Current timestamp, updated at the specified interval
 */
export function useAnimationLoop(intervalMs: number): number {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);

  return currentTime;
}
