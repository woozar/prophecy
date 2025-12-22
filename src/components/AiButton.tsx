"use client";

import { ReactNode, ButtonHTMLAttributes, memo, useMemo, useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "@/hooks/useReducedMotion";

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

interface AiButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export const AiButton = memo(function AiButton({ children, className = "", onClick, ...props }: Readonly<AiButtonProps>) {
  const reducedMotion = useReducedMotion();
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLButtonElement>(null);
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
    (e: React.MouseEvent<HTMLButtonElement>) => {
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

  const borderStyle = useMemo(() => ({
    padding: "2px",
    background: "linear-gradient(90deg, #22d3ee, #14b8a6, #8b5cf6, #a855f7, #22d3ee)",
    backgroundSize: "300% 100%",
    animation: reducedMotion ? "none" : "ai-button-flow 3s linear infinite",
    mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
    maskComposite: "exclude" as const,
    WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
    WebkitMaskComposite: "xor" as const,
  }), [reducedMotion]);

  const glowStyle = useMemo(() => ({
    background: "radial-gradient(ellipse at center, rgba(6, 182, 212, 0.15) 0%, transparent 70%)",
  }), []);

  const buttonClassName = useMemo(() => `
    relative px-6 py-3 rounded-lg font-semibold text-white
    overflow-hidden
    disabled:opacity-50 disabled:cursor-not-allowed
    ${reducedMotion ? "" : "transition-all duration-300 hover:enabled:scale-105 active:enabled:scale-95"}
    ${className}
  `.trim(), [reducedMotion, className]);

  const glowClassName = useMemo(() =>
    `absolute inset-0 rounded-lg opacity-0 hover:opacity-100 pointer-events-none ${reducedMotion ? "" : "transition-opacity duration-300"}`,
    [reducedMotion]
  );

  return (
    <button
      ref={containerRef}
      className={buttonClassName}
      style={{ background: "#102a43" }}
      onClick={handleClick}
      {...props}
    >
      {/* Animated flowing border gradient */}
      <div
        className="absolute inset-0 rounded-lg pointer-events-none"
        style={borderStyle}
      />
      {/* Inner glow on hover */}
      <div className={glowClassName} style={glowStyle} />
      <span className="relative z-10">{children}</span>
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
    </button>
  );
});
