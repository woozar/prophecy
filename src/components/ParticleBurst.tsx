'use client';

import { useEffect, useState, useRef, useCallback, useMemo, memo } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { type AngularParticle, MYSTICAL_COLORS } from '@/types/particle';

interface ParticleBurstConfig {
  /** Number of particles per burst (default: 8) */
  particleCount?: number;
  /** Minimum interval between bursts in ms - desktop (default: 30000) */
  desktopMinInterval?: number;
  /** Maximum interval between bursts in ms - desktop (default: 45000) */
  desktopMaxInterval?: number;
  /** Minimum interval between bursts in ms - mobile while touching (default: 200) */
  mobileMinInterval?: number;
  /** Maximum interval between bursts in ms - mobile while touching (default: 400) */
  mobileMaxInterval?: number;
  /** Flight speed in pixels per frame (default: 3) */
  speed?: number;
  /** Fade-out duration in ms (default: 1000) */
  fadeDuration?: number;
  /** Custom colors array (default: mystical theme colors) */
  colors?: string[];
  /** Min particle size in px (default: 2) */
  minSize?: number;
  /** Max particle size in px (default: 6) */
  maxSize?: number;
}

export const ParticleBurst = memo(function ParticleBurst({
  particleCount = 8,
  desktopMinInterval = 30000,
  desktopMaxInterval = 45000,
  mobileMinInterval = 200,
  mobileMaxInterval = 400,
  speed = 3,
  fadeDuration = 1000,
  colors = MYSTICAL_COLORS,
  minSize = 2,
  maxSize = 6,
}: Readonly<ParticleBurstConfig>) {
  const reducedMotion = useReducedMotion();
  const [particles, setParticles] = useState<AngularParticle[]>([]);
  const [isTouching, setIsTouching] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const mousePos = useRef({ x: 0, y: 0 });
  const particleIdRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  const minInterval = useMemo(
    () => (isMobile ? mobileMinInterval : desktopMinInterval),
    [isMobile, mobileMinInterval, desktopMinInterval]
  );

  const maxInterval = useMemo(
    () => (isMobile ? mobileMaxInterval : desktopMaxInterval),
    [isMobile, mobileMaxInterval, desktopMaxInterval]
  );

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(globalThis.matchMedia('(pointer: coarse)').matches);
    };
    checkMobile();
    globalThis.addEventListener('resize', checkMobile);
    return () => globalThis.removeEventListener('resize', checkMobile);
  }, []);

  // Track mouse/touch position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleTouchStart = (e: TouchEvent) => {
      setIsTouching(true);
      if (e.touches.length > 0) {
        mousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const handleTouchEnd = () => {
      setIsTouching(false);
    };

    globalThis.addEventListener('mousemove', handleMouseMove);
    globalThis.addEventListener('touchstart', handleTouchStart);
    globalThis.addEventListener('touchmove', handleTouchMove);
    globalThis.addEventListener('touchend', handleTouchEnd);
    globalThis.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      globalThis.removeEventListener('mousemove', handleMouseMove);
      globalThis.removeEventListener('touchstart', handleTouchStart);
      globalThis.removeEventListener('touchmove', handleTouchMove);
      globalThis.removeEventListener('touchend', handleTouchEnd);
      globalThis.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);

  // Create burst of particles
  const createBurst = useCallback(() => {
    const { x, y } = mousePos.current;

    // Don't create particles if mouse hasn't moved (still at 0,0)
    if (x === 0 && y === 0) return;

    const newParticles: AngularParticle[] = [];
    const angleStep = (Math.PI * 2) / particleCount;

    for (let i = 0; i < particleCount; i++) {
      // Add some randomness to angle and speed
      const baseAngle = angleStep * i;
      const angle = baseAngle + (Math.random() - 0.5) * 0.5;
      const particleSpeed = speed * (0.7 + Math.random() * 0.6);
      const size = minSize + Math.random() * (maxSize - minSize);
      const color = colors[Math.floor(Math.random() * colors.length)];

      newParticles.push({
        id: particleIdRef.current++,
        x,
        y,
        angle,
        speed: particleSpeed,
        opacity: 1,
        size,
        color,
        wobble: Math.random() * Math.PI * 2, // random starting phase
      });
    }

    setParticles((prev) => [...prev, ...newParticles]);

    // Schedule removal after fade duration
    const particleIds = new Set(newParticles.map((np) => np.id));
    const removeParticles = (prev: AngularParticle[]) => prev.filter((p) => !particleIds.has(p.id));
    setTimeout(() => setParticles(removeParticles), fadeDuration + 100);
  }, [particleCount, speed, fadeDuration, minSize, maxSize, colors]);

  // Set up random interval for bursts
  // On mobile: only while touching
  // On desktop: always active
  useEffect(() => {
    // Skip if user prefers reduced motion
    if (reducedMotion) return;
    // On mobile, only run while touching
    if (isMobile && !isTouching) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleNextBurst = () => {
      const randomInterval = minInterval + Math.random() * (maxInterval - minInterval);
      timeoutId = setTimeout(() => {
        createBurst();
        scheduleNextBurst();
      }, randomInterval);
    };

    scheduleNextBurst();
    return () => clearTimeout(timeoutId);
  }, [createBurst, minInterval, maxInterval, isMobile, isTouching, reducedMotion]);

  // Animate particles
  useEffect(() => {
    // Skip if user prefers reduced motion
    if (reducedMotion) return;

    const fadePerFrame = 1 / (fadeDuration / 16.67); // ~60fps

    const updateParticle = (p: AngularParticle): AngularParticle => {
      const wobbleAmount = Math.sin(p.wobble ?? 0) * 0.3;
      const newAngle = p.angle + wobbleAmount;
      return {
        ...p,
        x: p.x + Math.cos(newAngle) * p.speed,
        y: p.y + Math.sin(newAngle) * p.speed,
        angle: p.angle + (Math.random() - 0.5) * 0.2,
        opacity: Math.max(0, p.opacity - fadePerFrame),
        speed: p.speed * 0.97,
        wobble: (p.wobble ?? 0) + 0.3,
      };
    };

    const animate = () => {
      setParticles((prev) => prev.map(updateParticle));
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [fadeDuration, reducedMotion]);

  // Don't render anything if user prefers reduced motion
  if (reducedMotion) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            opacity: particle.opacity,
            boxShadow: `
              0 0 ${particle.size}px ${particle.color},
              0 0 ${particle.size * 3}px ${particle.color},
              0 0 ${particle.size * 6}px ${particle.color},
              0 0 ${particle.size * 10}px ${particle.color}90,
              0 0 ${particle.size * 16}px ${particle.color}50
            `,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  );
});
