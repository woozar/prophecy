'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  type VelocityParticle,
  BURST_COLORS,
  updateVelocityParticle,
  isParticleActive,
} from '@/types/particle';

interface UseClickParticlesOptions {
  /** Number of particles to create per burst (default: 8) */
  count?: number;
  /** Whether to enable particle bursts (default: true on mobile) */
  enabled?: boolean;
}

interface UseClickParticlesReturn<T extends HTMLElement> {
  /** Ref to attach to the clickable element */
  containerRef: React.RefObject<T | null>;
  /** Array of active particles */
  particles: VelocityParticle[];
  /** Click handler that creates particles and calls the original onClick */
  handleClick: (e: React.MouseEvent<T>, originalOnClick?: (e: React.MouseEvent<T>) => void) => void;
}

/**
 * Hook for creating particle burst effects on click (mobile only).
 * Handles particle creation, animation, and cleanup.
 */
export function useClickParticles<T extends HTMLElement = HTMLButtonElement>(
  options: UseClickParticlesOptions = {}
): UseClickParticlesReturn<T> {
  const { count = 8, enabled } = options;
  const isMobile = useIsMobile();
  const shouldShowParticles = enabled ?? isMobile;

  const [particles, setParticles] = useState<VelocityParticle[]>([]);
  const containerRef = useRef<T>(null);
  const particleIdRef = useRef(0);

  // Animate particles
  useEffect(() => {
    if (particles.length === 0) return;

    const animate = () => {
      setParticles((prev) => prev.map(updateVelocityParticle).filter(isParticleActive));
    };

    const frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [particles]);

  const handleClick = useCallback(
    (e: React.MouseEvent<T>, originalOnClick?: (e: React.MouseEvent<T>) => void) => {
      if (shouldShowParticles) {
        const x = e.clientX;
        const y = e.clientY;

        const newParticles: VelocityParticle[] = [];

        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
          const speed = 3 + Math.random() * 3;
          newParticles.push({
            id: particleIdRef.current++,
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            size: 3 + Math.random() * 4,
            color: BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)],
            opacity: 1,
          });
        }

        setParticles((prev) => [...prev, ...newParticles]);
      }

      originalOnClick?.(e);
    },
    [shouldShowParticles, count]
  );

  return {
    containerRef,
    particles,
    handleClick,
  };
}
