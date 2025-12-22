"use client";

import { memo, useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import NextLink from "next/link";
import type { ComponentProps } from "react";

type NextLinkProps = ComponentProps<typeof NextLink>;

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
}

const BURST_COLORS = ["#22d3ee", "#14b8a6", "#06b6d4", "#2dd4bf"];
const MOBILE_BREAKPOINT = 768;

function updateParticle(p: Particle): Particle {
  return {
    ...p,
    x: p.x + p.vx,
    y: p.y + p.vy,
    vy: p.vy + 0.15,
    opacity: p.opacity - 0.025,
  };
}

function isParticleActive(p: Particle): boolean {
  return p.opacity > 0;
}

export const Link = memo(function Link({
  children,
  onClick,
  ...props
}: NextLinkProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLAnchorElement>(null);
  const particleIdRef = useRef(0);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Animate particles
  useEffect(() => {
    if (particles.length === 0) return;

    const animate = () => {
      setParticles((prev) => prev.map(updateParticle).filter(isParticleActive));
    };

    const frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [particles]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (isMobile) {
        // Use viewport coordinates for fixed positioning
        const x = e.clientX;
        const y = e.clientY;

        const newParticles: Particle[] = [];
        const count = 8;

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

      onClick?.(e);
    },
    [isMobile, onClick]
  );

  return (
    <>
      <NextLink ref={containerRef} onClick={handleClick} {...props}>
        {children}
      </NextLink>
      {/* Particles - rendered in portal to escape overflow:hidden */}
      {particles.length > 0 && typeof document !== "undefined" && createPortal(
        <>
          {particles.map((p) => (
            <span
              key={p.id}
              className="fixed rounded-full pointer-events-none z-[9999]"
              style={{
                left: p.x,
                top: p.y,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                opacity: p.opacity,
                boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
        </>,
        document.body
      )}
    </>
  );
});
