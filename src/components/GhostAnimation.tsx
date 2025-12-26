'use client';

import { memo, useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface GhostInstance {
  id: number;
  x: number;
  y: number;
  image: string;
}

const GHOST_IMAGES = ['/ghost.png', '/ghost2.png', '/ghost3.png', '/ghost4.png', '/ghost5.png'];

const ANIMATION_DURATION = 1800; // 1.8 seconds
const MIN_INTERVAL = 60_000; // 60 seconds
const MAX_INTERVAL = 120_000; // 120 seconds
const GHOST_SIZE = 150;
const VIEWPORT_PADDING = 100;

export const GhostAnimation = memo(function GhostAnimation() {
  const reducedMotion = useReducedMotion();
  const [ghost, setGhost] = useState<GhostInstance | null>(null);
  const ghostIdRef = useRef(0);

  // Calculate random position within viewport
  const getRandomPosition = useCallback(() => {
    if (!globalThis.window) return { x: 0, y: 0 };

    return {
      x:
        VIEWPORT_PADDING +
        Math.random() *
          Math.max(0, globalThis.window.innerWidth - VIEWPORT_PADDING * 2 - GHOST_SIZE),
      y:
        VIEWPORT_PADDING +
        Math.random() *
          Math.max(0, globalThis.window.innerHeight - VIEWPORT_PADDING * 2 - GHOST_SIZE),
    };
  }, []);

  // Spawn ghost
  const spawnGhost = useCallback(() => {
    const position = getRandomPosition();
    const randomImage = GHOST_IMAGES[Math.floor(Math.random() * GHOST_IMAGES.length)];
    const newGhost: GhostInstance = {
      id: ghostIdRef.current++,
      image: randomImage,
      ...position,
    };
    setGhost(newGhost);

    // Remove ghost after animation completes
    setTimeout(() => {
      setGhost((current) => (current?.id === newGhost.id ? null : current));
    }, ANIMATION_DURATION + 100);
  }, [getRandomPosition]);

  // Set up random interval for spawning
  useEffect(() => {
    // Skip entirely if user prefers reduced motion
    if (reducedMotion) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleNextGhost = () => {
      const randomInterval = MIN_INTERVAL + Math.random() * (MAX_INTERVAL - MIN_INTERVAL);
      timeoutId = setTimeout(() => {
        spawnGhost();
        scheduleNextGhost();
      }, randomInterval);
    };

    // Start the cycle
    scheduleNextGhost();

    return () => clearTimeout(timeoutId);
  }, [spawnGhost, reducedMotion]);

  // Don't render if reduced motion or no ghost
  if (reducedMotion || !ghost) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden="true">
      <div
        key={ghost.id}
        className="absolute"
        style={{
          left: ghost.x,
          top: ghost.y,
          animation: 'ghost-fly-towards 1.8s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        }}
      >
        <Image src={ghost.image} alt="" width={GHOST_SIZE} height={GHOST_SIZE} priority={false} />
      </div>
    </div>
  );
});
