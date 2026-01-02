'use client';

import { useEffect, useState } from 'react';

/**
 * Hook for cycling through colors at a given interval
 * @param colors - Array of color names to cycle through
 * @param intervalMs - Interval in milliseconds between color changes
 * @returns Current color from the cycle
 */
export function useColorCycling(colors: string[], intervalMs: number): string {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (colors.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % colors.length);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [colors.length, intervalMs]);

  return colors[currentIndex] || 'cyan';
}
