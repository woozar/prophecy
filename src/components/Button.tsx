"use client";

import { ReactNode, memo, useMemo, useState, useCallback, useEffect, useRef, ButtonHTMLAttributes } from "react";
import { createPortal } from "react-dom";

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

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** Button variant */
  variant?: "primary" | "outline" | "ghost" | "danger" | "danger-outline" | "warning-outline" | "violet-outline";
}

const baseStyles = [
  "group",
  "relative",
  "overflow-hidden",
  "isolate",
  "cursor-pointer",
  "transition-all",
  "duration-300",
  "ease-out",
  "disabled:opacity-50",
  "disabled:cursor-not-allowed",
];

const variantStyles = {
  primary: [
    "px-6",
    "py-3",
    "rounded-lg",
    "font-semibold",
    "bg-gradient-to-br",
    "from-cyan-500",
    "to-teal-500",
    "text-[#0a1929]",
    "border-none",
    "enabled:hover:scale-105",
    "enabled:active:scale-95",
    "enabled:hover:shadow-[0_0_25px_rgba(6,182,212,0.5),0_10px_30px_rgba(0,0,0,0.3)]",
  ],
  outline: [
    "px-6",
    "py-3",
    "rounded-lg",
    "font-semibold",
    "bg-transparent",
    "text-cyan-400",
    "border",
    "border-cyan-500",
    "enabled:hover:scale-105",
    "enabled:active:scale-95",
    "enabled:hover:text-[#0a1929]",
    "enabled:hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]",
  ],
  ghost: [],
  danger: [
    "px-6",
    "py-3",
    "rounded-lg",
    "font-semibold",
    "bg-gradient-to-r",
    "from-red-500/80",
    "via-orange-500/80",
    "to-pink-500/80",
    "text-white",
    "border",
    "border-red-500/50",
    "enabled:hover:scale-105",
    "enabled:active:scale-95",
    "enabled:hover:shadow-[0_0_25px_rgba(239,68,68,0.4),0_0_50px_rgba(249,115,22,0.2)]",
  ],
  "danger-outline": [
    "px-6",
    "py-3",
    "rounded-lg",
    "font-semibold",
    "bg-transparent",
    "text-red-400",
    "border",
    "border-red-500",
    "enabled:hover:scale-105",
    "enabled:active:scale-95",
    "enabled:hover:text-white",
    "enabled:hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]",
  ],
  "warning-outline": [
    "px-6",
    "py-3",
    "rounded-lg",
    "font-semibold",
    "bg-transparent",
    "text-yellow-400",
    "border",
    "border-yellow-500",
    "enabled:hover:scale-105",
    "enabled:active:scale-95",
    "enabled:hover:text-white",
    "enabled:hover:shadow-[0_0_20px_rgba(234,179,8,0.3)]",
  ],
  "violet-outline": [
    "px-6",
    "py-3",
    "rounded-lg",
    "font-semibold",
    "bg-transparent",
    "text-violet-400",
    "border",
    "border-violet-500",
    "enabled:hover:scale-105",
    "enabled:active:scale-95",
    "enabled:hover:text-white",
    "enabled:hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]",
  ],
};

const overlayStyles = {
  primary: "bg-gradient-to-br from-cyan-400 to-emerald-500",
  outline: "bg-gradient-to-br from-cyan-500 to-teal-500",
  ghost: "",
  danger: "bg-gradient-to-r from-red-500 via-orange-500 to-pink-500",
  "danger-outline": "bg-gradient-to-r from-red-500 via-orange-500 to-pink-500",
  "warning-outline": "bg-gradient-to-r from-yellow-500 via-orange-500 to-amber-500",
  "violet-outline": "bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500",
};

export const Button = memo(function Button({
  children,
  variant = "primary",
  className = "",
  disabled,
  onClick,
  ...props
}: Readonly<ButtonProps>) {
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

  const buttonClassName = useMemo(() => {
    // Ghost variant skips baseStyles to allow full control via className
    if (variant === "ghost") {
      return className;
    }
    return [...baseStyles, ...variantStyles[variant], className]
      .filter(Boolean)
      .join(" ");
  }, [variant, className]);

  return (
    <button ref={containerRef} className={buttonClassName} disabled={disabled} onClick={handleClick} {...props}>
      {/* Hover overlay - shows gradient on hover */}
      {overlayStyles[variant] && (
        <span
          className={`absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-enabled:group-hover:opacity-100 ${overlayStyles[variant]}`}
          aria-hidden="true"
        />
      )}
      {/* Content */}
      {variant === "ghost" ? children : <span className="relative z-10">{children}</span>}
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
